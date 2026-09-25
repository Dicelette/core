import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import type { Engine } from "random-js";

/** Returns the identifier of a random engine, or "unknown" if unrecognized. */
export function getEngineId(engine: unknown): string {
	if (engine === NumberGenerator.engines.nodeCrypto) return "nodeCrypto";
	if (engine === NumberGenerator.engines.nativeMath) return "nativeMath";
	if (engine === NumberGenerator.engines.browserCrypto) return "browserCrypto";
	// Fallback: read a name or constructor off the object
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

/** Returns the random engine matching the given name. */
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
