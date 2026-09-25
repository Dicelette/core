import "uniformize";
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { type Engine, Random } from "random-js";
import { DiceTypeError } from "./errors";
import type { CustomCritical, StatisticalTemplate } from "./interfaces";
import { SIGN_REGEX_SPACE } from "./interfaces/constant";
import { diceTypeRandomParse } from "./verify_template";

/** Splits a dice string into the dice expression and its trailing comment (after #, //, [, or /*). */
export function splitDiceComment(dice: string): {
	dice: string;
	comment: string | undefined;
} {
	const match = /\s(#|\/{2}|\[|\/\*)(?<comment>.*)/i.exec(dice);
	if (!match?.groups) return { dice: dice.trimEnd(), comment: undefined };
	const comment = match.groups.comment.trim() || undefined;
	return { dice: dice.slice(0, match.index).trimEnd(), comment };
}

/** Standardizes the dice string, leaving bracketed text untouched. */
export function standardizeDice(dice: string): string {
	return dice.replace(/(\[[^\]]+])|([^[]+)/g, (_match, insideBrackets, outsideText) =>
		insideBrackets ? insideBrackets : outsideText.standardize().replaceAll("df", "dF")
	);
}

/** Checks whether a value is a number, including numeric strings. */
export function isNumber(value: unknown): boolean {
	return (
		value !== undefined &&
		(typeof value === "number" ||
			(!Number.isNaN(Number(value)) &&
				typeof value === "string" &&
				value.trim().length > 0))
	);
}

/** Replaces `{exp}` (or `{exp || default}`) in the dice string with a random value or its default. */
export function replaceExpByRandom(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): string {
	const diceRegex = /\{exp( ?\|\| ?(?<default>\d+))?}/gi;
	return dice.replace(diceRegex, (_match, _p1, _p2, _offset, _string, groups) => {
		const defaultValue = groups?.default;
		return defaultValue ?? randomInt(1, 999, engine).toString();
	});
}

/** Returns a random integer between min and max using the given engine. */
export function randomInt(
	min: number,
	max: number,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	rng?: Random
): number {
	if (!rng) rng = new Random(engine || undefined);
	return rng.integer(min, max);
}

/** Replaces a dice's comparison with the resolved sign and value from a custom critical. */
export function createCriticalCustom(
	dice: string,
	customCritical: CustomCritical,
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let customDice = dice;
	const compareValue = diceTypeRandomParse(customCritical.value, template, engine);
	if (compareValue.includes("$"))
		throw new DiceTypeError(compareValue, "createCriticalCustom");
	const comparaison = `${customCritical.sign}${compareValue}`;
	if (compareRegex) customDice = customDice.replace(SIGN_REGEX_SPACE, comparaison);
	else customDice += comparaison;
	return diceTypeRandomParse(customDice, template, engine);
}
