import type { DiceRoll, DiceRoller } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import { DiceTypeError } from "../errors";
import type { Compare, Resultat } from "../interfaces";
import { roll } from "../roll";
import { canComparisonSucceed } from "./compare";

/**
 * Gère le système de pity (relance en cas d'échec)
 */
export function handlePitySystem(
	dice: string,
	compare: Compare,
	diceRoll: DiceRoll | DiceRoll[],
	roller: DiceRoller,
	engine: Engine | null
): { rerollCount: number; result?: Resultat } {
	const currentRoll = Array.isArray(diceRoll) ? diceRoll[0] : diceRoll;
	const maxPossible = currentRoll ? currentRoll.maxTotal : null;
	const isComparisonPossible =
		maxPossible === null || canComparisonSucceed(maxPossible, compare);

	if (!isComparisonPossible) {
		return { rerollCount: 0 };
	}

	let isFail = evaluate(`${roller.total}${compare.sign}${compare.value}`);
	if (isFail) {
		return { rerollCount: 0 };
	}

	const maxReroll = 100;
	let rerollCount = 0;
	let res: Resultat | undefined;

	while (!isFail && rerollCount < maxReroll) {
		try {
			res = roll(dice, engine, false);
		} catch (error) {
			throw new DiceTypeError(dice, "roll", error);
		}
		rerollCount++;
		if (res && res.total !== undefined) {
			isFail = evaluate(`${res.total}${compare.sign}${compare.value}`);
		}
	}

	return { rerollCount, result: res };
}
