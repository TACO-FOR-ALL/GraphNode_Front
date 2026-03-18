import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(__dirname, "..");

await mkdir(path.join(cliRoot, "dist"), { recursive: true });

await build({
  absWorkingDir: cliRoot,
  entryPoints: [path.join(cliRoot, "src/index.js")],
  outfile: path.join(cliRoot, "dist/index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: {
    js: "#!/usr/bin/env node",
  },
  packages: "bundle",
});
