/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
  // Proxy API calls to the FastAPI backend.
  // INTERNAL_API_URL is used server-side (Docker: http://backend:8000).
  // Falls back to NEXT_PUBLIC_API_URL then localhost for local dev.
  async rewrites() {
    const target =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;