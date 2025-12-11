/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn-icons-png.flaticon.com",
      },
      {
        protocol: "https",
        hostname: "thispersondoesnotexist.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",    // para las canchas
      },
      {
        protocol: "https",
        hostname: "example.com",          // logo de prueba
      },
      {
        protocol: "https",
        hostname: "your-real-domain.com", // opcional
      },
    ],
  },
};

module.exports = nextConfig;
