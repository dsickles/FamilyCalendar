import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/calendar": ["./lib/__fixtures__/**/*"],
  },
};

export default nextConfig;
