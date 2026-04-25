import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "node_modules/.prisma/**/*",
      "node_modules/@prisma/client/**/*",
      "node_modules/@prisma/adapter-mssql/**/*",
      "node_modules/mssql/**/*",
      "node_modules/tedious/**/*",
    ],
  },
};

export default nextConfig;
