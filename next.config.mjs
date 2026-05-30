/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist"],
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: "filesystem",
        compression: "gzip",
        store: "pack",
        maxMemoryGenerations: 1,
      };
    }
    return config;
  },
};

export default nextConfig;
