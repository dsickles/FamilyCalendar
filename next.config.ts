import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // `next dev` only serves its client scripts to localhost by default, so a
  // page opened from 127.0.0.1, or from the frame or a phone on the home
  // network, loads without JavaScript. Dev only; production is unaffected.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.*.*.*", "*.local"],
  outputFileTracingIncludes: {
    "/api/calendar": ["./lib/__fixtures__/**/*"],
  },
};

export default nextConfig;
