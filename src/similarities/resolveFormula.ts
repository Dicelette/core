import { evaluate } from "mathjs";
import { MIN_THRESHOLD_MATCH } from "../interfaces";
import { isNumber } from "../utils";
import { findBestStatMatch } from "./similarity";

export type FormulaHintResult =
	| { kind: "resolved"; value: number }
	| { kind: "error" }
	| { kind: "not-formula" };

function toFiniteNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	return undefined;
}

function substituteFormulaTokens(
	expr: string,
	resolvedStats: Map<string, number>,
	similarityThreshold = MIN_THRESHOLD_MATCH
): string {
	return expr.replace(/([\p{L}\p{M}._-]+)*/gu, (token) => {
		const match = findBestStatMatch<number>(token, resolvedStats, similarityThreshold);
		return match !== undefined ? match.toString() : token;
	});
}

export function resolveFormulaHint(
	formula: string,
	allAttributes: Record<string, number | string>,
	similarityThreshold = MIN_THRESHOLD_MATCH
): FormulaHintResult {
	const trimmed = formula.trim();
	if (!trimmed) return { kind: "not-formula" };
	if (isNumber(trimmed)) return { kind: "not-formula" };

	const resolved = new Map<string, number>();
	const pending = new Map<string, string>();

	for (const [name, val] of Object.entries(allAttributes)) {
		const norm = name.standardize();
		if (typeof val === "number") {
			if (Number.isFinite(val)) resolved.set(norm, val);
			continue;
		}
		const t = val.trim();
		if (!t) continue;
		if (isNumber(t)) {
			const numeric = Number(t);
			if (Number.isFinite(numeric)) resolved.set(norm, numeric);
		} else {
			pending.set(norm, t.standardize());
		}
	}

	for (const [normName, expr] of pending) {
		pending.set(normName, substituteFormulaTokens(expr, resolved, similarityThreshold));
	}

	let progress = true;
	while (pending.size > 0 && progress) {
		progress = false;
		for (const [normName, expr] of pending) {
			try {
				const result = toFiniteNumber(evaluate(expr));
				if (result === undefined) continue;
				resolved.set(normName, result);
				pending.delete(normName);
				progress = true;
				for (const [otherNorm, otherExpr] of pending) {
					pending.set(
						otherNorm,
						substituteFormulaTokens(otherExpr, resolved, similarityThreshold)
					);
				}
			} catch {
				// Not yet resolvable, retry on the next round.
			}
		}
	}

	const normFormula = trimmed.standardize();
	const expr = substituteFormulaTokens(normFormula, resolved, similarityThreshold);
	try {
		const result = toFiniteNumber(evaluate(expr));
		if (result !== undefined) return { kind: "resolved", value: result };
		return { kind: "error" };
	} catch {
		return { kind: "error" };
	}
}
