import { evaluate } from "mathjs";
import { REMOVER_PATTERN } from "./interfaces";

export type FormulaValidationResult = { ok: true } | { ok: false; error: string };

/** Matches dice notation like `1d6`, `d20`, `3d8` (not valid mathjs). */
const DICE_NOTATION = /\b\d*d\d+\b/gi;

/** Checks that a `customFormula` is valid mathjs once dice/critical syntax is replaced with test values. */
export function validateCustomFormula(formula: string): FormulaValidationResult {
	const expr = formula
		.replaceAll("$", "50")
		.replace(REMOVER_PATTERN.CRITICAL_BLOCK, "")
		.replace(REMOVER_PATTERN.EXP_REMOVER, "")
		.replace(DICE_NOTATION, "3")
		.trim();

	if (!expr) return { ok: false, error: "Empty formula" };

	try {
		evaluate(expr);
		return { ok: true };
	} catch (e) {
		return { ok: false, error: e instanceof Error ? e.message : String(e) };
	}
}
