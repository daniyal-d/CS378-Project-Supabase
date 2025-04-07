import type { NextConfig } from "next";

// const isProd = process.env.NODE_ENV === "production";
const nextConfig: NextConfig = {
  /* config options here */

  // Might need to add output: 'export' if we want to deploy to github pages
  // output: 'export',
  
  // webpack(config) {
  //   // Ensure that webpack uses a relative publicPath for static assets.
  //   if (!config.output) config.output = {};
  //   config.output.publicPath = "./_next/"; // This makes CSS, JS, etc. load relatively.
  //   return config;
  // },
  // basePath: "/cs378-project",
  // assetPrefix: "/cs378-project/",
  images: { unoptimized: true }
};

export default nextConfig;
