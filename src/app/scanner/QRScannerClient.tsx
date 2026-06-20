"use client";

/**
 * QRScannerClient — Client Component
 *
 * Uses html5-qrcode to access the device camera and scan QR codes.
 * When a QR code is detected:
 * 1. Stops the camera to prevent repeated scans
 * 2. Sends the decoded token to POST /api/scanner/validate
 * 3. Displays a color-coded result (green/red/orange)
 * 4. Allows scanning another ticket
 *
 * html5-qrcode works by rendering into a div with a specific ID.
 * We manage its lifecycle using useEffect and useRef.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

// The shape of the response from /api/scanner/validate
type ScanResult =
  | { result: "VALID"; message: string; ticket: { event: { name: string; date: string; venue: string }; quantity: number; scannedAt: string } }
  | { result: "USED"; message: string; ticket: { event: { name: string }; scannedAt: string } }
  | { result: "INVALID"; message: string; detail: string }
  | null;

// Unique ID for the div that html5-qrcode renders into
const SCANNER_ELEMENT_ID = "qr-scanner-region";

export default function QRScannerClient() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

  // Called when a QR code is successfully decoded
  const onScanSuccess = useCallback(async (decodedText: string) => {
    // Stop scanning immediately to prevent double-scans
    if (scannerRef.current) {
      await scannerRef.current.clear();
      setIsScannerActive(false);
    }

    setIsValidating(true);
    setScanResult(null);

    try {
      // Send token to backend for validation
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: decodedText.trim() }),
      });

      const data = await response.json();
      setScanResult(data);
    } catch {
      setScanResult({
        result: "INVALID",
        message: "CONNECTION ERROR",
        detail: "Failed to reach the server. Please try again.",
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Called when the scanner encounters an error (this fires frequently — it's normal)
  const onScanError = useCallback((errorMessage: string) => {
    // Most errors are just "no QR found in frame" — we suppress these
    // Only log actual scanner initialization errors
    if (errorMessage.includes("Camera")) {
      console.warn("Scanner error:", errorMessage);
    }
  }, []);

  // Start the camera scanner
  const startScanner = useCallback(() => {
    setScanResult(null);
    setScannerError(null);

    try {
      const scanner = new Html5QrcodeScanner(
        SCANNER_ELEMENT_ID,
        {
          fps: 10, // Frames per second to scan
          qrbox: { width: 280, height: 280 }, // Scan region size in px
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
          showZoomSliderIfSupported: true,
        },
        /* verbose= */ false
      );

      scanner.render(onScanSuccess, onScanError);
      scannerRef.current = scanner;
      setIsScannerActive(true);
    } catch (error) {
      console.error("Failed to start scanner:", error);
      setScannerError(
        "Failed to access camera. Please allow camera permissions and try again."
      );
    }
  }, [onScanSuccess, onScanError]);

  // Cleanup scanner when component unmounts
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="space-y-6">

      {/* Scanner Window */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">

        {/* Scanner Area */}
        <div className="p-6">
          {!isScannerActive && !scanResult && !isValidating && (
            // Initial state — show start button
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📷</div>
              <p className="text-gray-400 mb-6 text-sm">
                Tap the button below to activate the camera scanner
              </p>
              <button
                onClick={startScanner}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl transition-colors text-lg"
              >
                Start Scanner
              </button>
            </div>
          )}

          {/* Camera feed renders into this div */}
          <div
            id={SCANNER_ELEMENT_ID}
            className={isScannerActive ? "block" : "hidden"}
          />

          {/* Scanner Error */}
          {scannerError && (
            <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm px-4 py-3 rounded-lg text-center">
              {scannerError}
            </div>
          )}
        </div>
      </div>

      {/* Validation Loading State */}
      {isValidating && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 text-gray-400">
            <svg className="animate-spin w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-lg font-semibold">Validating ticket...</span>
          </div>
        </div>
      )}

      {/* Scan Result Display */}
      {scanResult && !isValidating && (
        <div className={`rounded-2xl border-2 overflow-hidden ${
          scanResult.result === "VALID"
            ? "border-green-500 bg-green-900/20"
            : scanResult.result === "USED"
            ? "border-orange-500 bg-orange-900/20"
            : "border-red-500 bg-red-900/20"
        }`}>

          {/* Result Header */}
          <div className={`px-6 py-5 text-center ${
            scanResult.result === "VALID"
              ? "bg-green-900/40"
              : scanResult.result === "USED"
              ? "bg-orange-900/40"
              : "bg-red-900/40"
          }`}>
            <div className="text-5xl mb-3">
              {scanResult.result === "VALID" ? "✅" : scanResult.result === "USED" ? "⚠️" : "❌"}
            </div>
            <h2 className={`text-2xl font-extrabold ${
              scanResult.result === "VALID"
                ? "text-green-400"
                : scanResult.result === "USED"
                ? "text-orange-400"
                : "text-red-400"
            }`}>
              {scanResult.message}
            </h2>
          </div>

          {/* Result Details */}
          <div className="px-6 py-5 space-y-3">
            {scanResult.result === "VALID" && scanResult.ticket && (
              <>
                <DetailRow label="Event" value={scanResult.ticket.event.name} />
                <DetailRow label="Venue" value={scanResult.ticket.event.venue} />
                <DetailRow
                  label="Date"
                  value={new Date(scanResult.ticket.event.date).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric", year: "numeric"
                  })}
                />
                <DetailRow
                  label="Tickets"
                  value={`${scanResult.ticket.quantity} ticket${scanResult.ticket.quantity > 1 ? "s" : ""}`}
                />
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
                  value={scanResult.ticket.scannedAt
                    ? new Date(scanResult.ticket.scannedAt).toLocaleString()
                    : "Unknown"}
                />
              </>
            )}

            {scanResult.result === "INVALID" && (
              <p className="text-red-400 text-sm text-center">
                {(scanResult as { result: "INVALID"; message: string; detail: string }).detail}
              </p>
            )}
          </div>

          {/* Scan Another Button */}
          <div className="px-6 pb-6 text-center">
            <button
              onClick={startScanner}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold px-8 py-3 rounded-xl transition-colors"
            >
              Scan Next Ticket
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!scanResult && !isValidating && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h3 className="text-gray-400 font-semibold text-sm mb-3 uppercase tracking-wider">
            Instructions
          </h3>
          <ul className="space-y-2 text-gray-500 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold flex-shrink-0">1.</span>
              Tap &quot;Start Scanner&quot; and allow camera access
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold flex-shrink-0">2.</span>
              Point camera at the attendee&apos;s QR code
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold flex-shrink-0">3.</span>
              Wait for the green screen — then allow entry
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 font-bold flex-shrink-0">4.</span>
              Orange or red screens — deny entry
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Small helper component for detail rows
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-gray-500 text-sm flex-shrink-0">{label}</span>
      <span className="text-white text-sm font-semibold text-right">{value}</span>
    </div>
  );
}