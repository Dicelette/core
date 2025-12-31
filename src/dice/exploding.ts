import type { DiceRoll } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Compare } from "../interfaces";
import { matchComparison } from "./signs";

export type ExplodingSuccess = {
	dice: string;
	originalDice: string;
	sign: Compare["sign"];
	value: number;
	normalizedSegment: string;
	originalSegment: string;
};

export const EXPLODING_SUCCESS_REGEX =
	/(!(?:>>=|<<=|!==|!!==|>>|<<|==|!=))(-?\d+(?:\.\d+)?)/;

export function normalizeExplodingSuccess(dice: string): ExplodingSuccess | undefined {
	const match = dice.match(EXPLODING_SUCCESS_REGEX);
	if (!match) return undefined;

	const [, doubledSignRaw, valueStr] = match;
	let doubledSign: string;
	if (doubledSignRaw === "!!==") doubledSign = "==";
	else if (doubledSignRaw === "!==") doubledSign = "!==";
	else doubledSign = doubledSignRaw.replace(/^!/, "");
	const signMap: Record<string, Compare["sign"]> = {
		">>": ">",
		"<<": "<",
		">>=": ">=",
		"<<=": "<=",
		"==": "=",
		"!==": "!=",
		"!!==": "=",
	};

	const normalizedSign = signMap[doubledSign];
	if (!normalizedSign) return undefined;
	let parsedValue = Number.parseFloat(valueStr);
	if (Number.isNaN(parsedValue)) {
		try {
			parsedValue = Number.parseFloat(evaluate(valueStr) as unknown as string);
		} catch (_error) {
			parsedValue = 0;
		}
	}

	// Remove comparison for the actual explode mechanic so it uses default explode
	const normalizedSegment = "!";
	const replacedDice = dice.replace(match[0], normalizedSegment);

	return {
		dice: replacedDice,
		originalDice: dice,
		sign: normalizedSign,
		value: parsedValue,
		normalizedSegment,
		originalSegment: match[0],
	};
}

export function countExplodingSuccesses(
	diceRoll: DiceRoll | DiceRoll[],
	sign: Compare["sign"],
	value: number
): number {
	const rollsArray = Array.isArray(diceRoll) ? diceRoll : [diceRoll];
	const flatValues: number[] = [];

	for (const dr of rollsArray) {
		const groups = (dr as DiceRoll).rolls ?? [];
		for (const group of groups as unknown as Array<{
			rolls?: Array<{ value?: number }>;
		}>) {
			const innerRolls = group.rolls ?? [];
			for (const roll of innerRolls) {
				if (typeof roll.value === "number") flatValues.push(roll.value);
			}
		}
	}

	return flatValues.reduce(
		(acc, current) => acc + (matchComparison(sign, current, value) ? 1 : 0),
		0
	);
}
