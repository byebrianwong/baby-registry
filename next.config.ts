import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The end-to-end tests run their own dev server against the local database
  // (see e2e/README.md). Its own folder keeps it from sharing compiled files,
  // which hold the Supabase address, with a dev server that uses production.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
