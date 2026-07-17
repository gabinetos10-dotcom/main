import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Le site n'embarque aucune image raster distante : tout est SVG/CSS/WebGL.
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
