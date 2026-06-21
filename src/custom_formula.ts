import { evaluate } from "mathjs";
import { REMOVER_PATTERN } from "./interfaces";

export type FormulaValidationResult = { ok: true } | { ok: false; error: string };

/** Matches dice notation like `1d6`, `d20`, `3d8` (not valid mathjs). */
const DICE_NOTATION = /\b\d*d\d+\b/gi;

/**
 * Validates a `customFormula` string by stripping dice-specific syntax and running
 * a mathjs evaluation with a numeric test value substituted for `$`.
 *
 * Transformations applied before evaluation:
 * - `$` → `50` (mid-range value that exercises both branches of common `>=` conditions)
 * - `{cs:...}` / `{cf:...}` critical blocks → removed (they are dice-roller suffixes,
 *   always attached to a number — removing them leaves the number intact)
 * - `{exp...}` expression blocks → removed
 * - Dice notation (`1d6`, `d20`, `3d8`, …) → replaced with `3`
 *
 * @returns `{ ok: true }` when the formula is structurally valid mathjs,
 *          `{ ok: false, error }` otherwise.
 *
 * @example
 * validateCustomFormula("$>=85?85{cs:>=5+($-85)}:$") // { ok: true }
 * validateCustomFormula("$>=10?2d6:1")               // { ok: true }
 * validateCustomFormula("$+**2")                     // { ok: false, error: "..." }
 */
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
