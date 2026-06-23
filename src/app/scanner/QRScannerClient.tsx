"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type ScanResult =
  | {
      result: "VALID";
      message: string;
      ticket: {
        event: { name: string; date: string; venue: string };
        quantity: number;
        scannedAt: string;
        ticketNumber?: number;
        totalInOrder?: number;
      };
    }
  | {
      result: "USED";
      message: string;
      detail: string;
      ticket: { event: { name: string }; scannedAt: string | null };
    }
  | {
      result: "INVALID";
      message: string;
      detail: string;
    }
  | {
      result: "ERROR";
      message: string;
      detail?: string;
    }
  | null;

export default function QRScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // ── Stop everything ───────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setIsScannerActive(false);
    setIsStarting(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // ── Validate token ────────────────────────────────────────────
  const validateToken = useCallback(
    async (token: string) => {
      stopCamera();
      setIsValidating(true);
      setScanResult(null);

      try {
        const response = await fetch("/api/scanner/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim() }),
        });
        const data = await response.json();
        setScanResult(data);
      } catch {
        setScanResult({
          result: "INVALID",
          message: "CONNECTION ERROR",
          detail: "Failed to reach server. Please try again.",
        });
      } finally {
        setIsValidating(false);
      }
    },
    [stopCamera]
  );

  // ── Scan frame using jsQR ─────────────────────────────────────
  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState < 2) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Try BarcodeDetector first (Chrome Android)
    if ("BarcodeDetector" in window) {
      try {
        const detector = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
        const codes = await detector.detect(canvas);
        if (codes.length > 0) {
          await validateToken(codes[0].rawValue);
          return;
        }
      } catch {
        // BarcodeDetector failed — try jsQR below
      }
    }

    // Try jsQR (works on iPhone Safari)
    try {
      const jsQR = (await import("jsqr")).default;
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code) {
        await validateToken(code.data);
      }
    } catch {
      // jsQR not available
    }
  }, [validateToken]);

  // ── Start camera (iOS compatible) ─────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanResult(null);
    setIsStarting(true);
    setDebugInfo("Requesting camera...");

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("NOT_SUPPORTED");
      setIsStarting(false);
      return;
    }

    try {
      // iOS Safari requires these EXACT constraints
      // Do NOT use advanced constraints on iOS — they cause failures
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: "environment", // back camera
        },
      };

      setDebugInfo("Calling getUserMedia...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setDebugInfo("Stream obtained! Setting up video...");

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setCameraError("UNKNOWN");
        return;
      }

      // iOS Safari CRITICAL requirements:
      video.setAttribute("autoplay", "");
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", ""); // ← MOST IMPORTANT for iOS
      video.muted = true;
      video.srcObject = stream;

      setDebugInfo("Video element configured, waiting for metadata...");

      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video metadata timeout"));
        }, 10000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          setDebugInfo(
            `Metadata loaded! Size: ${video.videoWidth}x${video.videoHeight}`
          );
          resolve();
        };

        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("Video error"));
        };
      });

      // Play the video
      setDebugInfo("Playing video...");
      await video.play();
      setDebugInfo("Video playing!");

      setIsScannerActive(true);
      setIsStarting(false);

      // Start scanning every 500ms
      scanIntervalRef.current = setInterval(() => {
        scanFrame();
      }, 500);
    } catch (error: any) {
      console.error("Camera error:", error);
      setDebugInfo(`Error: ${error.name} — ${error.message}`);
      setIsStarting(false);

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setCameraError("PERMISSION_DENIED");
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setCameraError("NO_CAMERA");
      } else if (error.name === "NotSupportedError") {
        setCameraError("NOT_SUPPORTED");
      } else if (error.name === "NotReadableError") {
        setCameraError("IN_USE");
      } else {
        setCameraError("UNKNOWN");
      }
    }
  }, [scanFrame]);

  return (
    <div className="space-y-6">

      {/* Scanner Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

        {/* Initial State */}
        {!isScannerActive &&
          !isStarting &&
          !scanResult &&
          !isValidating &&
          !cameraError && (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">📷</div>
              <h3 className="text-white font-bold text-lg mb-2">
                Ready to Scan
              </h3>
              <p className="text-gray-400 text-sm mb-2">
                Tap the button below to open the camera.
              </p>
              <p className="text-yellow-400 text-xs mb-6">
                ⚠️ When asked for camera permission — tap{" "}
                <strong>Allow</strong>
              </p>
              <button
                onClick={startCamera}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl transition-colors text-lg w-full"
              >
                🎥 Start Scanner
              </button>
            </div>
          )}

        {/* Starting / Loading */}
        {isStarting && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4 animate-pulse">📷</div>
            <h3 className="text-white font-bold text-lg mb-3">
              Starting Camera...
            </h3>
            <p className="text-yellow-400 text-sm font-semibold mb-2">
              If you see a permission popup — tap Allow
            </p>
            <p className="text-gray-500 text-xs mt-4">{debugInfo}</p>
          </div>
        )}

        {/* Camera Errors */}
        {cameraError && (
          <div className="p-8 text-center">
            {cameraError === "PERMISSION_DENIED" && (
              <>
                <div className="text-5xl mb-4">🚫</div>
                <h3 className="text-red-400 font-bold text-lg mb-3">
                  Camera Permission Denied
                </h3>
                <div className="bg-gray-800 rounded-xl p-4 text-left text-sm text-gray-300 space-y-2 mb-6">
                  <p className="font-bold text-white mb-2">
                    iPhone Safari fix:
                  </p>
                  <p>1. Close Safari completely</p>
                  <p>2. Open iPhone Settings app</p>
                  <p>3. Scroll down → tap Safari</p>
                  <p>4. Tap Camera → select Allow</p>
                  <p>5. Come back to Safari and reload</p>
                  <div className="border-t border-gray-700 my-3" />
                  <p className="font-bold text-white mb-2">OR:</p>
                  <p>1. Tap the AA button in Safari address bar</p>
                  <p>2. Tap Website Settings</p>
                  <p>3. Camera → Allow</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl w-full mb-3"
                >
                  Reload Page After Allowing
                </button>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setDebugInfo("");
                  }}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-6 py-3 rounded-xl w-full"
                >
                  Try Again
                </button>
              </>
            )}

            {cameraError === "IN_USE" && (
              <>
                <div className="text-5xl mb-4">📵</div>
                <h3 className="text-red-400 font-bold text-lg mb-3">
                  Camera In Use
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  The camera is being used by another app. Close the
                  camera app or FaceTime and try again.
                </p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setDebugInfo("");
                  }}
                  className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl w-full"
                >
                  Try Again
                </button>
              </>
            )}

            {cameraError === "NOT_SUPPORTED" && (
              <>
                <div className="text-5xl mb-4">⚠️</div>
                <h3 className="text-yellow-400 font-bold text-lg mb-3">
                  Not Supported
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Camera not supported in this browser. On iPhone use
                  Safari. On Android use Chrome.
                </p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setDebugInfo("");
                  }}
                  className="bg-gray-700 text-white font-bold px-6 py-3 rounded-xl w-full"
                >
                  Try Again
                </button>
              </>
            )}

            {(cameraError === "NO_CAMERA" ||
              cameraError === "UNKNOWN") && (
              <>
                <div className="text-5xl mb-4">❌</div>
                <h3 className="text-red-400 font-bold text-lg mb-3">
                  Camera Error
                </h3>
                <p className="text-gray-400 text-sm mb-2">
                  Could not access the camera.
                </p>
                <p className="text-gray-600 text-xs mb-4">{debugInfo}</p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    setDebugInfo("");
                  }}
                  className="bg-yellow-500 text-black font-bold px-6 py-3 rounded-xl w-full"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* 
          VIDEO ELEMENT
          Always rendered in DOM but hidden when not active.
          iOS Safari requires the video element to exist before
          srcObject is assigned. If we conditionally render it,
          the ref will be null when we need it.
        */}
        <div className={isScannerActive ? "block" : "hidden"}>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline          // ← CRITICAL for iOS Safari
              controls={false}
              style={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "cover",
                display: "block",
                backgroundColor: "#000",
              }}
            />

            {/* Scan overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  width: "220px",
                  height: "220px",
                  border: "2px solid #EAB308",
                  borderRadius: "16px",
                  position: "relative",
                }}
              >
                {/* Corners */}
                {[
                  { top: 0, left: 0, borderTop: true, borderLeft: true },
                  { top: 0, right: 0, borderTop: true, borderRight: true },
                  { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
                  { bottom: 0, right: 0, borderBottom: true, borderRight: true },
                ].map((corner, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: "24px",
                      height: "24px",
                      top: corner.top !== undefined ? -2 : undefined,
                      bottom: corner.bottom !== undefined ? -2 : undefined,
                      left: corner.left !== undefined ? -2 : undefined,
                      right: corner.right !== undefined ? -2 : undefined,
                      borderTop: corner.borderTop ? "4px solid #EAB308" : undefined,
                      borderBottom: corner.borderBottom ? "4px solid #EAB308" : undefined,
                      borderLeft: corner.borderLeft ? "4px solid #EAB308" : undefined,
                      borderRight: corner.borderRight ? "4px solid #EAB308" : undefined,
                      borderTopLeftRadius: corner.top !== undefined && corner.left !== undefined ? "8px" : undefined,
                      borderTopRightRadius: corner.top !== undefined && corner.right !== undefined ? "8px" : undefined,
                      borderBottomLeftRadius: corner.bottom !== undefined && corner.left !== undefined ? "8px" : undefined,
                      borderBottomRightRadius: corner.bottom !== undefined && corner.right !== undefined ? "8px" : undefined,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Status */}
            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.8)",
                padding: "12px 16px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "#EAB308",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                🔍 Point camera at QR code
              </p>
            </div>
          </div>

          {/* Stop button */}
          <div style={{ padding: "16px" }}>
            <button
              onClick={stopCamera}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Stop Camera
            </button>
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      {/* Validating */}
      {isValidating && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="animate-spin w-8 h-8 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-white font-semibold text-lg">
              Validating ticket...
            </span>
          </div>
        </div>
      )}

      {/* Result */}
{scanResult && !isValidating && (
  <div
    className={`rounded-2xl border-2 overflow-hidden ${
      scanResult.result === "VALID"
        ? "border-green-500 bg-green-900/20"
        : scanResult.result === "USED"
          ? "border-orange-500 bg-orange-900/20"
          : "border-red-500 bg-red-900/20"
    }`}
  >
    {/* Header */}
    <div
      className={`px-6 py-8 text-center ${
        scanResult.result === "VALID"
          ? "bg-green-900/40"
          : scanResult.result === "USED"
            ? "bg-orange-900/40"
            : "bg-red-900/40"
      }`}
    >
      <div className="text-6xl mb-3">
        {scanResult.result === "VALID"
          ? "✅"
          : scanResult.result === "USED"
            ? "⚠️"
            : "❌"}
      </div>
      <h2
        className={`text-2xl font-extrabold ${
          scanResult.result === "VALID"
            ? "text-green-400"
            : scanResult.result === "USED"
              ? "text-orange-400"
              : "text-red-400"
        }`}
      >
        {scanResult.message}
      </h2>
    </div>

    {/* Details */}
    <div className="px-6 py-5 space-y-3">
      {scanResult.result === "VALID" && scanResult.ticket && (
        <>
          <DetailRow label="Event" value={scanResult.ticket.event.name} />
          <DetailRow label="Venue" value={scanResult.ticket.event.venue} />
          {scanResult.ticket.totalInOrder && scanResult.ticket.totalInOrder > 1 && (
            <DetailRow
              label="Seat"
              value={`${scanResult.ticket.ticketNumber} of ${scanResult.ticket.totalInOrder}`}
            />
          )}
          <DetailRow
            label="Scanned At"
            value={new Date(scanResult.ticket.scannedAt).toLocaleTimeString()}
          />
        </>
      )}

      {scanResult.result === "USED" && scanResult.ticket && (
        <>
          <DetailRow label="Event" value={scanResult.ticket.event.name} />
          <DetailRow
            label="Previously Scanned"
            value={
              scanResult.ticket.scannedAt
                ? new Date(scanResult.ticket.scannedAt).toLocaleString()
                : "Unknown time"
            }
          />
        </>
      )}

      {scanResult.result === "INVALID" && (
        <p className="text-red-400 text-sm text-center">
          {scanResult.detail}
        </p>
      )}

      {scanResult.result === "ERROR" && (
        <p className="text-red-400 text-sm text-center">
          {scanResult.detail ?? "Please try again or restart the scanner"}
        </p>
      )}
    </div>

    {/* Scan Next Button */}
    <div className="px-6 pb-6">
      <button
        onClick={() => {
          setScanResult(null);
          setCameraError(null);
          setDebugInfo("");
        }}
        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 rounded-xl transition-colors"
      >
        📷 Scan Next Ticket
      </button>
    </div>
  </div>
)}

      {/* Instructions */}
      {!isScannerActive && !scanResult && !isStarting && !cameraError && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 font-semibold text-sm mb-3 uppercase tracking-wider">
            Instructions
          </h3>
          <ul className="space-y-2 text-gray-500 text-sm">
            <li className="flex gap-2">
              <span className="text-yellow-400 font-bold">1.</span>
              Tap Start Scanner and allow camera
            </li>
            <li className="flex gap-2">
              <span className="text-yellow-400 font-bold">2.</span>
              Point camera at the attendee QR code
            </li>
            <li className="flex gap-2">
              <span className="text-green-400 font-bold">3.</span>
              Green = valid, let them in
            </li>
            <li className="flex gap-2">
              <span className="text-red-400 font-bold">4.</span>
              Orange or red = deny entry
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-white text-sm font-semibold text-right">{value}</span>
    </div>
  );
}