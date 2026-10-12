import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/v1/auth/me", destination: "http://127.0.0.1:8000/api/v1/auth/me/" },
      { source: "/api/v1/auth/me/", destination: "http://127.0.0.1:8000/api/v1/auth/me/" },
      { source: "/api/v1/auth/login", destination: "http://127.0.0.1:8000/api/v1/auth/login/" },
      { source: "/api/v1/auth/login/", destination: "http://127.0.0.1:8000/api/v1/auth/login/" },
      { source: "/api/v1/queue", destination: "http://127.0.0.1:8000/api/v1/queue/" },
      { source: "/api/v1/queue/", destination: "http://127.0.0.1:8000/api/v1/queue/" },
      { source: "/api/v1/queue/summary", destination: "http://127.0.0.1:8000/api/v1/queue/summary/" },
      { source: "/api/v1/queue/summary/", destination: "http://127.0.0.1:8000/api/v1/queue/summary/" },
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*/" },
    ];
  },
};

export default nextConfig;
