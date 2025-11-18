import { defineConfig } from "tsup";

const args = process.argv.slice(2);
const isDev = args.includes("--watch") || args.includes("--dev") || args.includes("-d") || args.includes("-w");

console.log(`Building in ${isDev ? "development" : "production"} mode...`);

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"], // Build for commonJS and ESmodules
	dts: true, // Generate declaration file (.d.ts)
	splitting: false,
	sourcemap: true,
	clean: true,
	esbuildOptions: options => {
		options.drop = !isDev ? ["console", "debugger"] : [];
	}
});
