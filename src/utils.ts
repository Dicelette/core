import { evaluate } from "mathjs";
import "uniformize";
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { type Engine, Random } from "random-js";
import { FormulaError } from ".";

/**
 * Escape regex string
 * @param string {string}
 */
export function escapeRegex(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Allow to keep the text as if in brackets
 * @param dice {string}
 * @return {string} the dice with the text in brackets as if, but the dice (not in brackets) is standardized
 */
export function standardizeDice(dice: string): string {
	return dice.replace(/(\[[^\]]+\])|([^[]+)/g, (_match, insideBrackets, outsideText) =>
		insideBrackets ? insideBrackets : outsideText.standardize()
	);
}

/**
 * Replace the stat name by their value using stat
 * and after evaluate any formula using `replaceFormulaInDice`
 * @param {string} originalDice
 * @param {Record<string,number>|undefined} stats
 * @param {string|undefined} dollarValue
 */
export function generateStatsDice(
	originalDice: string,
	stats?: Record<string, number>,
	dollarValue?: string
) {
	let dice = originalDice.standardize();
	if (stats && Object.keys(stats).length > 0) {
		//damage field support adding statistic, like : 1d6 + strength
		//check if the value contains a statistic & calculate if it's okay
		//the dice will be converted before roll
		const allStats = Object.keys(stats);
		for (const stat of allStats) {
			const regex = new RegExp(`(?!\\[)${escapeRegex(stat.standardize())}(?!\\])`, "gi");
			if (dice.match(regex)) {
				const statValue = stats[stat];
				dice = dice.replace(regex, statValue.toString());
			}
		}
	}
	if (dollarValue) dice = dice.replaceAll("$", dollarValue);
	return replaceFormulaInDice(dice);
}

/**
 * Replace the {{}} in the dice string and evaluate the interior if any
 * @param dice {string}
 */
export function replaceFormulaInDice(dice: string) {
	const formula = /(?<formula>\{{2}(.+?)}{2})/gim;
	// biome-ignore lint/suspicious/noImplicitAnyLet: needed for regex loop
	let match;
	let modifiedDice = dice;
	// biome-ignore lint/suspicious/noAssignInExpressions: best way to regex in a loop
	while ((match = formula.exec(dice)) !== null) {
		if (match.groups?.formula) {
			const formulae = match.groups.formula.replaceAll("{{", "").replaceAll("}}", "");
			try {
				const result = evaluate(formulae);
				modifiedDice = modifiedDice.replace(match.groups.formula, result.toString());
			} catch (error) {
				throw new FormulaError(match.groups.formula, "replaceFormulasInDice", error);
			}
		}
	}

	return cleanedDice(modifiedDice);
}

/**
 * Replace the ++ +- -- by their proper value:
 * - `++` = `+`
 * - `+-` = `-`
 * - `--` = `+`
 * @param dice {string}
 */
function cleanedDice(dice: string) {
	return dice
		.replaceAll("+-", "-")
		.replaceAll("--", "+")
		.replaceAll("++", "+")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimEnd();
}

/**
 * Verify if a value is a number, even if it's a "number" string
 * @param value {unknown}
 * @returns {boolean}
 */
export function isNumber(value: unknown): boolean {
	return (
		value !== undefined &&
		(typeof value === "number" ||
			(!Number.isNaN(Number(value)) &&
				typeof value === "string" &&
				value.trim().length > 0))
	);
}

/**
 * Replace the `{exp}` in the dice.
 * If the `{exp}` has a default value in the form of `{exp || defaultValue}`, it will be replaced by the default value.
 * @param {string} dice
 * @param engine
 * @returns {string} the dice with the {exp} replaced by a random value
 */
export function replaceExpByRandom(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): string {
	const diceRegex = /\{exp( ?\|\| ?(?<default>\d+))?}/gi;
	return dice.replace(diceRegex, (_match, _p1, _p2, _offset, _string, groups) => {
		const defaultValue = groups?.default;
		return defaultValue ?? randomInt(1, 999, engine).toString();
	});
}

/**
 * Utility function to get a random integer between min and max and using the specified engine
 * @param min {number}
 * @param max {number}
 * @param engine {Engine | null} Engine to use, default to nodeCrypto
 * @param rng {Random | undefined} Random instance to use, see https://www.npmjs.com/package/random-js#usage
 * @returns {number} Random integer between min and max
 */
export function randomInt(
	min: number,
	max: number,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	rng?: Random
): number {
	if (!rng) rng = new Random(engine || undefined);
	return rng.integer(min, max);
}
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
