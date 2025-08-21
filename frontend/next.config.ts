import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Produce a smaller, self-contained server for Docker/Cloud Run
  output: 'standalone',
};

export default nextConfig;
