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
		const statKeys = Object.keys(stats);
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
			const tokenRegex = /(\$?[\p{L}\p{N}_]+)/gu;
			let lastIndex = 0;
			let tokenMatch: RegExpExecArray | null;
			// biome-ignore lint/suspicious/noAssignInExpressions: best way to regex in a loop
			while ((tokenMatch = tokenRegex.exec(outsideText)) !== null) {
				result += outsideText.slice(lastIndex, tokenMatch.index);
				const token = tokenMatch[0];
				const tokenStd = token.standardize();

				// Check for dice notation patterns like "1dstat1" or "dstat1"
				const diceMatch = /^(\d*)d(.+)$/i.exec(tokenStd);
				if (diceMatch) {
					const diceCount = diceMatch[1] || "";
					const afterD = diceMatch[2];
					let foundStatAfterD = false;
					for (const key of statKeys) {
						const keyStd = key.standardize();
						if (afterD === keyStd) {
							result += `${diceCount}d${stats[key].toString()}`;
							foundStatAfterD = true;
							break;
						}
					}
					if (foundStatAfterD) {
						lastIndex = tokenRegex.lastIndex;
						continue;
					}
				}

				let bestKey: string | null = null;
				let bestScore = 0;
				for (const key of statKeys) {
					const keyStd = key.standardize();
					if (tokenStd === keyStd) {
						bestKey = key;
						bestScore = 1;
						break;
					}
					const score = similarityScore(tokenStd, keyStd);
					if (score > bestScore) {
						bestScore = score;
						bestKey = key;
					}
				}
				if (bestKey && bestScore >= 0.6) {
					const statValue = stats[bestKey];
					result += statValue.toString();
				} else {
					result += token;
				}
				lastIndex = tokenRegex.lastIndex;
			}
			result += outsideText.slice(lastIndex);
		}
		dice = result;
	}
	if (dollarValue) dice = dice.replaceAll(/\$\B/g, dollarValue);
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
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	const al = a.length;
	const bl = b.length;
	if (al === 0) return bl;
	if (bl === 0) return al;
	const v0 = new Array<number>(bl + 1);
	const v1 = new Array<number>(bl + 1);
	for (let i = 0; i <= bl; i++) v0[i] = i;
	for (let i = 0; i < al; i++) {
		v1[0] = i + 1;
		for (let j = 0; j < bl; j++) {
			const cost = a[i] === b[j] ? 0 : 1;
			v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
		}
		for (let j = 0; j <= bl; j++) v0[j] = v1[j];
	}
	return v1[bl];
}

/**
 * Score de similarité normalisé entre 0 et 1 (1 = identique)
 */
function similarityScore(a: string, b: string): number {
	const la = a.length;
	const lb = b.length;
	if (la === 0 && lb === 0) return 1;
	const dist = levenshteinDistance(a, b);
	const max = Math.max(la, lb);
	return 1 - dist / max;
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
