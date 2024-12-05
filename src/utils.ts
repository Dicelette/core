import { evaluate } from "mathjs";
import "uniformize";
import { FormulaError } from "./errors";

/**
 * Escape regex string
 * @param string {string}
 */
export function escapeRegex(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace the stat name by their value using stat and after evaluate any formula using `replaceFormulaInDice`
 * @param originalDice {dice}
 * @param stats {[name: string]: number}
 */
export function generateStatsDice(
	originalDice: string,
	stats?: { [name: string]: number }
) {
	let dice = originalDice.standardize();
	if (stats && Object.keys(stats).length > 0) {
		//damage field support adding statistic, like : 1d6 + strength
		//check if the value contains a statistic & calculate if it's okay
		//the dice will be converted before roll
		const allStats = Object.keys(stats);
		for (const stat of allStats) {
			const regex = new RegExp(escapeRegex(stat.standardize()), "gi");
			if (dice.match(regex)) {
				const statValue = stats[stat];
				dice = dice.replace(regex, statValue.toString());
			}
		}
	}
	return replaceFormulaInDice(dice);
}

/**
 * Replace the {{}} in the dice string and evaluate the interior if any
 * @param dice {string}
 */
export function replaceFormulaInDice(dice: string) {
	const formula = /(?<formula>\{{2}(.+?)}{2})/gim;
	// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
	let match;
	let modifiedDice = dice.standardize();
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
export function cleanedDice(dice: string) {
	return dice.replaceAll("+-", "-").replaceAll("--", "+").replaceAll("++", "+").trimEnd();
}
