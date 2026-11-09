/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // pdfkit reads its AFM data files from disk at runtime.
  serverExternalPackages: ["pdfkit"],
  images: {
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }],
    deviceSizes: [390, 640, 828, 1080, 1280, 1600],
    imageSizes: [96, 160, 256, 384],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
