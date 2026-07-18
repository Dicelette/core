import { defineConfig } from "tsdown";

const args = process.argv.slice(2);
const isDev = args.includes("--watch") || args.includes("--dev") || args.includes("-d") || args.includes("-w");

console.log(`Building in ${isDev ? "development" : "production"} mode...`);

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"], // Build for commonJS and ESmodules
	dts: true, // Generate declaration file (.d.ts)
	sourcemap: true,
	clean: true,
	// Keep .js/.mjs/.d.ts output names (package.json is "type": "commonjs")
	// instead of tsdown's node-platform default of fixed .cjs/.mjs extensions.
	fixedExtension: false,
	define: isDev
		? {}
		: {
				// Silence console output in production builds (esbuild's `drop` has no tsdown equivalent)
				"console.log": "(() => {})",
				"console.debug": "(() => {})",
				"console.info": "(() => {})",
				"console.warn": "(() => {})",
			},
});
