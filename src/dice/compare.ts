import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import { type ComparedValue, SIGN_REGEX, SIGN_REGEX_SPACE } from "../interfaces";
import { roll } from "../roll";
import { isNumber } from "../utils";

/** Checks whether a comparison is trivial: always true or always false given the roll bounds. */
export function isTrivialComparison(
	maxValue: number,
	minValue: number,
	compare: ComparedValue
): boolean {
	const canSucceed = canComparisonSucceed(maxValue, compare, minValue);
	const canFail = canComparisonFail(maxValue, compare, minValue);
	return !canSucceed || !canFail;
}

/** Checks whether a comparison can fail at least once given the roll bounds. */
export function canComparisonFail(
	maxRollValue: number,
	compare: ComparedValue,
	minRollValue = 1
): boolean {
	switch (compare.sign) {
		case ">":
			return minRollValue <= compare.value;
		case ">=":
			return minRollValue < compare.value;
		case "<":
			return maxRollValue >= compare.value;
		case "<=":
			return maxRollValue > compare.value;
		case "=":
		case "==":
			return minRollValue !== compare.value || maxRollValue !== compare.value;
		case "!=":
			return minRollValue <= compare.value && compare.value <= maxRollValue;
		default:
			return true;
	}
}

export function rollCompare(
	value: unknown,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
) {
	if (isNumber(value)) return { value: Number.parseInt(value as string, 10) };
	if (!value || (typeof value === "string" && value.trim() === "")) {
		return { value: 0, diceResult: value as string };
	}
	const rollComp = roll(value as string, engine, pity);
	if (!rollComp?.total) {
		// Not a dice throw; try evaluating as a formula
		try {
			return { value: evaluate(value as string), diceResult: value as string };
		} catch (error) {
			return { value: 0, diceResult: value as string };
		}
	}
	return {
		dice: value as string,
		value: rollComp.total,
		diceResult: rollComp?.result,
	};
}
/**
 * Extracts a comparison from the dice string. `{...}` groups use "target success" counting
 * (e.g. `{2d3>=4}` counts qualifying dice) instead of comparing the total.
 */
export function getCompare(
	dice: string,
	compareRegex: RegExpMatchArray,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
): { dice: string; compare: ComparedValue | undefined } {
	if (
		dice.match(
			/((\{[^}]*,[^}]*\}|([><=!]+\d+f))([><=]|!=)+\d+\}?)|\{[^}]*(([><=]|!=)+)[^}]*\}/
		)
	)
		return { dice, compare: undefined };
	dice = dice.replace(SIGN_REGEX_SPACE, "");
	let compare: ComparedValue;
	// compareRegex[1] = sign (e.g. ">="), compareRegex[2] = compared value/expression
	const calc = compareRegex[2];
	const sign = calc.match(/[+-/*^]/)?.[0];
	const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];

	if (sign) {
		const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "").replace(/;(.*)/, "");
		const rCompare = rollCompare(toCalc, engine, pity);
		const total = evaluate(rCompare.value.toString());
		dice = dice.replace(SIGN_REGEX_SPACE, `${compareSign}${total}`);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: total,
			originalDice: rCompare.dice,
			rollValue: rCompare.diceResult,
		};
	} else {
		const rcompare = rollCompare(calc, engine, pity);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: rcompare.value,
			originalDice: rcompare.dice,
			rollValue: rcompare.diceResult,
		};
	}

	return { dice, compare };
}

/** Checks whether a comparison can succeed at least once given the roll bounds. */
export function canComparisonSucceed(
	maxRollValue: number,
	compare: ComparedValue,
	minRollValue?: number
): boolean {
	switch (compare.sign) {
		case ">":
			return maxRollValue > compare.value;
		case ">=":
			return maxRollValue >= compare.value;
		case "<":
			return compare.value > (minRollValue ?? 1);
		case "<=":
			return compare.value >= (minRollValue ?? 1);
		case "=":
		case "==":
			return maxRollValue >= compare.value && compare.value >= (minRollValue ?? 1);
		case "!=":
			return maxRollValue !== compare.value || (minRollValue ?? 1) !== compare.value;
		default:
			return true;
	}
}
