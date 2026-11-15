import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'application vit dans le sous-dossier "planning" du dépôt.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
