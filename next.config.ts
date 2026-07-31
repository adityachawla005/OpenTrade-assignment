import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root — otherwise Next may walk up and pick a lockfile
  // outside the project.
  outputFileTracingRoot: path.join(__dirname),

  // better-sqlite3 is a native module; it must not be bundled by the server
  // compiler or the .node binding fails to resolve at runtime.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
