/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Keep the client bundle lean: these heavy motion libs are split per-route.
  experimental: {
    optimizePackageImports: ["framer-motion", "gsap"],
  },
};

export default nextConfig;
