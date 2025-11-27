import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for optimized production builds (Docker/nixpacks)
  output: 'standalone',
  
  // Environment variable validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  },
};

export default nextConfig;
