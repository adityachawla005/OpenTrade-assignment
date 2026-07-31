import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — otherwise Next may walk up and pick a lockfile
  // outside the project.
  outputFileTracingRoot: path.join(__dirname),

};

export default nextConfig;
