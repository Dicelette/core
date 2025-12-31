import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import type { ComparedValue } from "../interfaces";
import { SIGN_REGEX, SIGN_REGEX_SPACE } from "../interfaces/constant";
import { rollCompare } from "../roll";

/**
 * Check if a comparison is trivial (always true or always false)
 * Uses the existing canComparisonSucceed logic and checks both success and failure conditions
 * @param maxValue Maximum possible value from the dice roll
 * @param minValue Minimum possible value from the dice roll
 * @param compare The comparison object
 * @returns true if the comparison is trivial (always true or always false)
 */
export function isTrivialComparison(
	maxValue: number,
	minValue: number,
	compare: ComparedValue
): boolean {
	// Check if comparison can never succeed (always false)
	const canSucceed = canComparisonSucceed(maxValue, compare, minValue);

	// Check if comparison can never fail (always true) by checking the inverse with minValue
	const canFail = canComparisonFail(maxValue, compare, minValue);

	// Trivial if it can never succeed OR can never fail
	return !canSucceed || !canFail;
}

/**
 * Check if a comparison can theoretically fail given roll bounds
 * @param maxRollValue Maximum possible roll value
 * @param compare The comparison object
 * @param minRollValue Minimum possible roll value (defaults to 1)
 * @returns true if the comparison can fail at least once
 */
export function canComparisonFail(
	maxRollValue: number,
	compare: ComparedValue,
	minRollValue = 1
): boolean {
	switch (compare.sign) {
		case ">":
			return minRollValue <= compare.value; // failure if roll <= value
		case ">=":
			return minRollValue < compare.value; // failure if roll < value
		case "<":
			return maxRollValue >= compare.value; // failure if roll >= value
		case "<=":
			return maxRollValue > compare.value; // failure if roll > value
		case "=":
		case "==":
			return minRollValue !== compare.value || maxRollValue !== compare.value; // can differ
		case "!=":
			return minRollValue <= compare.value && compare.value <= maxRollValue; // equality possible
		default:
			return true;
	}
}

export function getCompare(
	dice: string,
	compareRegex: RegExpMatchArray,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
): { dice: string; compare: ComparedValue | undefined } {
	/**
	 * @source: https://dice-roller.github.io/documentation/guide/notation/modifiers.html#target-success-dice-pool
	 * Some system count the number of a dice that are greater than or equal to a target, and not the "total" of rolled dice.
	 * We "count" the number of dice that meet a criterion, and not the total of the dice.
	 * To support this, we use the group notation. It a little different than the notation of dice-roller, but it a sacrifice to not break the current notation.
	 * @note:
	 * - `{2d3}>=4` will be the same as `2d3>=4` and thus keep the comparaison.
	 * - `{2d3>=4}` will count the total of dice that are greater than or equal to 4, and not the total of the dice.
	 * - `{2d3,1d4}>=4` won't use the comparison, but will count the number of dice that are greater than or equal to 4. If the total of the dice is needed, just remove the group notation and use `2d3+1d4>=4`.
	 */
	if (
		dice.match(/((\{.*,(.*)+\}|([><=!]+\d+f))([><=]|!=)+\d+\}?)|\{(.*)(([><=]|!=)+).*\}/)
	)
		return { dice, compare: undefined };
	dice = dice.replace(SIGN_REGEX_SPACE, "");
	let compare: ComparedValue;
	// compareRegex comes from SIGN_REGEX_SPACE: /([><=]|!=)+(\S+)/
	// index 1 = the comparison sign (e.g., ">", ">=", "!="); index 2 = the compared value/expression
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

/**
 * Check if a comparison can theoretically succeed given a maximum roll value
 * @example
 * canComparisonSucceed(10, { sign: ">=", value: 15 }) => false (impossible to roll >= 15 with 1d10)
 * canComparisonSucceed(20, { sign: ">=", value: 15 }) => true (possible to roll >= 15 with 1d20)
 */
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
			return compare.value > (minRollValue ?? 1); // Au moins minRollValue possible
		case "<=":
			return compare.value >= (minRollValue ?? 1); // Au moins minRollValue possible
		case "=":
		case "==":
			return maxRollValue >= compare.value && compare.value >= (minRollValue ?? 1);
		case "!=":
			return maxRollValue !== compare.value || (minRollValue ?? 1) !== compare.value;
		default:
			return true;
	}
}
