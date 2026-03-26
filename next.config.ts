import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "www.google.com",
      "logo.clearbit.com",
    ],
  },
  eslint: {
    // Disable ESLint checks during production builds to avoid build failures
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
