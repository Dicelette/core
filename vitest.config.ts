import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		deps: {
			optimizer: {
				ssr: {
					enabled: true,
					include: ["@dice-roller/rpg-dice-roller"],
				},
			},
		},
	},
});
