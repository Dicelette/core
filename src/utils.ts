import { evaluate } from "mathjs";
import "uniformize";
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { type Engine, Random } from "random-js";
import {
	type CustomCritical,
	DiceTypeError,
	diceTypeRandomParse,
	FormulaError,
	SIGN_REGEX_SPACE,
	type StatisticalTemplate,
} from ".";
import { findBestStatMatch } from "./similarity";

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
	return dice.replace(/(\[[^\]]+])|([^[]+)/g, (_match, insideBrackets, outsideText) =>
		insideBrackets ? insideBrackets : outsideText.standardize().replaceAll("df", "dF")
	);
}

// Helper to handle tokens like "1dstat" or "dstat". Returns the replacement string (e.g. "1d6") or null if not handled.
function handleDiceAfterD(
	tokenStd: string,
	normalizedStats: Map<string, [string, number]>,
	minThreshold: number
): string | null {
	const diceMatch = /^(\d*)d(.+)$/i.exec(tokenStd);
	if (!diceMatch) return null;
	const diceCount = diceMatch[1] || "";
	const afterD = diceMatch[2];
	const bestMatch = findBestStatMatch(afterD, normalizedStats, minThreshold);
	if (bestMatch) {
		console.log("Best match for dice-after-d ", tokenStd, "is", bestMatch);
		const [, value] = bestMatch;
		return `${diceCount}d${value.toString()}`;
	}
	return null;
}

// Helper to handle simple tokens (stat names). Returns the replacement (numeric string) or the original token if no match.
function handleSimpleToken(
	tokenStd: string,
	token: string,
	normalizedStats: Map<string, [string, number]>,
	minThreshold: number
): string {
	const bestMatch = findBestStatMatch(tokenStd, normalizedStats, minThreshold);
	if (bestMatch) {
		console.log("Best match for ", tokenStd, "is", bestMatch);
		const [, value] = bestMatch;
		return value.toString();
	}
	return token;
}

/**
 * Replace the stat name by their value using stat
 * and after evaluate any formula using `replaceFormulaInDice`
 * @param {string} originalDice
 * @param {Record<string,number>|undefined} stats
 * @param {string|undefined} dollarValue
 * @param minThreshold
 */
export function generateStatsDice(
	originalDice: string,
	stats?: Record<string, number>,
	dollarValue?: string,
	minThreshold = 0.6
) {
	let dice = originalDice.standardize();
	if (stats && Object.keys(stats).length > 0) {
		const normalizedStats = new Map<string, [string, number]>();
		for (const [key, value] of Object.entries(stats)) {
			const normalized = key.standardize();
			normalizedStats.set(normalized, [key, value]);
		}
		const partsRegex = /(\[[^\]]+])|([^[]+)/g;
		let result = "";
		let match: RegExpExecArray | null;
		// biome-ignore lint/suspicious/noAssignInExpressions: best way to regex in a loop
		while ((match = partsRegex.exec(dice)) !== null) {
			const insideBrackets = match[1];
			const outsideText = match[2];
			if (insideBrackets) {
				result += insideBrackets;
				continue;
			}
			if (!outsideText) {
				continue;
			}
			const tokenRegex = /(\$?[\p{L}\p{N}_.-]+)/gu;
			let lastIndex = 0;
			let tokenMatch: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: best way to regex in a loop
			while ((tokenMatch = tokenRegex.exec(outsideText)) !== null) {
				result += outsideText.slice(lastIndex, tokenMatch.index);
				const token = tokenMatch[0];
				const tokenHasDollar = token.startsWith("$");
				const tokenForCompare = tokenHasDollar ? token.slice(1) : token;
				const tokenStd = tokenForCompare.standardize();

				// First try dice-after-d pattern using helper
				const diceReplacement = handleDiceAfterD(tokenStd, normalizedStats, minThreshold);
				if (diceReplacement) {
					result += diceReplacement;
					lastIndex = tokenRegex.lastIndex;
					continue;
				}

				// Otherwise handle as simple token (stat name or leave as is)
				result += handleSimpleToken(tokenStd, token, normalizedStats, minThreshold);
				lastIndex = tokenRegex.lastIndex;
			}
			result += outsideText.slice(lastIndex);
		}
		dice = result;
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
 * Allow to replace the compare part of a dice and use the critical customized one
 * @example
 * dice = "1d20=20";
 * custom critical {sign: ">", value: "$/2"}
 * Random stats = 6
 * result = "1d20>3"
 */
export function createCriticalCustom(
	dice: string,
	customCritical: CustomCritical,
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let customDice = dice;
	const compareValue = diceTypeRandomParse(customCritical.value, template, engine);
	if (compareValue.includes("$"))
		throw new DiceTypeError(compareValue, "createCriticalCustom");
	const comparaison = `${customCritical.sign}${compareValue}`;
	if (compareRegex) customDice = customDice.replace(SIGN_REGEX_SPACE, comparaison);
	else customDice += comparaison;
	return diceTypeRandomParse(customDice, template, engine);
}
