import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import type { Engine } from "random-js";

/**
 * Utility function that allow to get the id of an engine
 * @param engine {unknown} Engine to identify
 * @returns {string} Id of the engine or "unknown"
 * @private
 */
export function getEngineId(engine: unknown): string {
	// Comparaisons directes avec les engines exposés par la lib
	if (engine === NumberGenerator.engines.nodeCrypto) return "nodeCrypto";
	if (engine === NumberGenerator.engines.nativeMath) return "nativeMath";
	if (engine === NumberGenerator.engines.browserCrypto) return "browserCrypto";
	// Fallback: essayer de lire un nom ou le constructeur
	try {
		// biome-ignore lint/suspicious/noExplicitAny: needed for dynamic access
		const e = engine as any;
		if (e && typeof e === "object") {
			if (typeof e.name === "string" && e.name) return e.name;
			if (e.constructor?.name) return e.constructor.name;
		}
	} catch {
		/* ignore */
	}
	return "unknown";
}

/**
 * Utility function to get the engine from its name
 * @param engine {"nativeMath" | "browserCrypto" | "nodeCrypto"} The engine name
 * @returns {Engine} The engine
 * @public
 */
export function getEngine(engine: "nativeMath" | "browserCrypto" | "nodeCrypto"): Engine {
	switch (engine) {
		case "nativeMath":
			return NumberGenerator.engines.nativeMath;
		case "browserCrypto":
			return NumberGenerator.engines.browserCrypto;
		case "nodeCrypto":
			return NumberGenerator.engines.nodeCrypto;
		default:
			return NumberGenerator.engines.nativeMath;
	}
}
