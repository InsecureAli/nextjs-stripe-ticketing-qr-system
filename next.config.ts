// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   images: {
//     // Allow images from these external domains
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "images.unsplash.com",
//       },
//     ],
//   },
  
//   // Required for the Stripe webhook route to receive the raw request body
//   // (configured per-route, not globally)
// };

// export default nextConfig;


import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;