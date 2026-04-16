import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/aidoc",
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/home",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
