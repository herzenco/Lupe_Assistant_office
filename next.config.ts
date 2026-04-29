import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DASHBOARD_API_KEY: process.env.DASHBOARD_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

export default nextConfig;
