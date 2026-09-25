import { evaluate } from "mathjs";
import { FormulaError } from "../errors";
import { roll } from "../roll";
import { findBestStatMatch } from "./similarity";

/** Handles tokens like `1dstat`/`dstat`; returns the replacement (e.g. `1d6`) or null. */
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

/** Replaces a stat-name token with its value, or returns it unchanged if no match. */
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

/** Replaces stat names in the dice string with their values, then evaluates any `{{formula}}`. */
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

				const diceReplacement = handleDiceAfterD(tokenStd, normalizedStats);
				if (diceReplacement) {
					result += diceReplacement;
					lastIndex = tokenRegex.lastIndex;
					continue;
				}

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

/** Rolls each unique dice notation (e.g. `1d6`) in a formula once, reusing the value for repeats. */
function rollDiceInFormula(formulae: string): string {
	const diceNotation = /\b\d*d\d+\b/gi;
	if (!diceNotation.test(formulae)) return formulae;
	diceNotation.lastIndex = 0;
	const diceMap = new Map<string, string>();
	return formulae.replace(diceNotation, (match) => {
		const key = match.toLowerCase();
		if (!diceMap.has(key)) {
			const rollResult = roll(match);
			if (rollResult?.total) diceMap.set(key, rollResult.total.toString());
		}
		return diceMap.get(key)!;
	});
}

/** Evaluates `{{formula}}` blocks in the dice string and replaces them with their result. */
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
				const formulaeWithRolls = rollDiceInFormula(formulae);
				const result = evaluate(formulaeWithRolls);
				modifiedDice = modifiedDice.replace(match.groups.formula, result.toString());
			} catch (error) {
				throw new FormulaError(match.groups.formula, "replaceFormulasInDice", error);
			}
		}
	}

	return cleanedDice(modifiedDice);
}

/** Normalizes sign runs: `++`→`+`, `+-`→`-`, `--`→`+`. */
function cleanedDice(dice: string) {
	return dice
		.replaceAll("+-", "-")
		.replaceAll("--", "+")
		.replaceAll("++", "+")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimEnd();
}
