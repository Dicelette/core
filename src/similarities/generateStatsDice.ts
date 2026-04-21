// Helper to handle tokens like "1dstat" or "dstat". Returns the replacement string (e.g. "1d6") or null if not handled.
import { evaluate } from "mathjs";
import { FormulaError } from "../errors";
import { findBestStatMatch } from "./similarity";

function handleDiceAfterD(
	tokenStd: string,
	normalizedStats: Map<string, [string, number]>
): string | null {
	const diceMatch = /^(\d*)d(.+)$/i.exec(tokenStd);
	if (!diceMatch) return null;
	const diceCount = diceMatch[1] || "";
	const afterD = diceMatch[2];
	const bestMatch = findBestStatMatch(afterD, normalizedStats, 1);
	if (bestMatch) {
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
 * @param {number} minThreshold Minimum similarity threshold to consider a stat name match
 * @param {string|undefined} dollarValue
 */
export function generateStatsDice(
	originalDice: string,
	stats?: Record<string, number>,
	minThreshold = 0.6,
	dollarValue?: string
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
			const tokenRegex = /(\$?[\p{L}\p{N}_.]+)/gu;
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
				const diceReplacement = handleDiceAfterD(tokenStd, normalizedStats);
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
