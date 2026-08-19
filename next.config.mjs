/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No image host, no font host, no CDN. Everything this page needs it serves.
  images: { unoptimized: true },
};

export default nextConfig;
