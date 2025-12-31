import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import type { Compare, Resultat } from "../interfaces";
import { replaceInFormula, roll } from "../roll";
import { getCompare, isTrivialComparison } from "./compare";
import { replaceText } from "./replace";

export function matchComparison(sign: Compare["sign"], val: number, value: number) {
	switch (sign) {
		case ">":
			return val > value;
		case ">=":
			return val >= value;
		case "<":
			return val < value;
		case "<=":
			return val <= value;
		case "=":
		case "==":
			return val === value;
		case "!=":
			return val !== value;
		default:
			return false;
	}
}

export function inverseSign(
	sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "=="
): "<" | ">" | ">=" | "<=" | "=" | "!=" | "==" {
	switch (sign) {
		case "<":
			return ">";
		case ">":
			return "<";
		case "<=":
			return ">=";
		case ">=":
			return "<=";
		case "=":
			return "!=";
		case "==":
			return "!=";
		case "!=":
			return "==";
	}
}

export function compareSignFormule(
	toRoll: string,
	compareRegex: RegExpMatchArray,
	element: string,
	diceResult: Resultat,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean,
	rollBounds?: { min: number; max: number }
): { dice: string; results: string; compare?: Compare; trivial: boolean } {
	let results = "";
	let trivial = false;
	const compareResult = getCompare(toRoll, compareRegex, engine);
	const toCompare = `${compareResult.dice}${compareResult.compare?.sign}${compareResult.compare?.value}`;
	let res: unknown;
	try {
		res = evaluate(toCompare);
	} catch (error) {
		res = roll(toCompare, engine, pity);
	}
	if (typeof res === "boolean") {
		const detectedTrivial =
			rollBounds && compareResult.compare
				? isTrivialComparison(rollBounds.max, rollBounds.min, compareResult.compare)
				: false;
		if (detectedTrivial && compareResult.compare) compareResult.compare.trivial = true;
		if (detectedTrivial) trivial = true;
		results = replaceInFormula(element, diceResult, compareResult, res, engine, pity);
	} else if (res instanceof Object) {
		const diceResult = res as Resultat;
		if (diceResult.compare) {
			const toEvaluate = evaluate(
				`${diceResult.total}${diceResult.compare.sign}${diceResult.compare.value}`
			);
			const sign = toEvaluate ? "✓" : "✕";
			const invertedSign = toEvaluate
				? diceResult.compare.sign
				: inverseSign(diceResult.compare.sign);
			const dice = replaceText(element, 0, diceResult.dice).diceAll;

			results = `${sign} ${dice}: ${diceResult.result.split(":").splice(1).join(":").trim()}${invertedSign}${diceResult.compare.value}`;
			if (diceResult.compare.trivial) trivial = true;
		}
	}
	return { dice: compareResult.dice, results, compare: compareResult.compare, trivial };
}
