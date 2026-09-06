/**
 * Bundles the serverless handlers from `server/` into self-contained ESM files in `api/`.
 * Vercel transpiles ESM TypeScript per file without bundling, so extensionless relative
 * imports into `engine/` fail at runtime; a single bundled file per function avoids that.
 * npm packages stay external and are traced from package.json by Vercel.
 */
import { build } from "esbuild";

await build({
  entryPoints: ["server/extract.ts", "server/analyze-call.ts"],
  outdir: "api",
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node22",
  packages: "external",
  sourcemap: false,
  logLevel: "info",
});
