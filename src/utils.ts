import "uniformize";
import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { type Engine, Random } from "random-js";
import { DiceTypeError } from "./errors";
import type { CustomCritical, StatisticalTemplate } from "./interfaces";
import { SIGN_REGEX_SPACE } from "./interfaces/constant";
import { diceTypeRandomParse } from "./verify_template";

/**
 * Splits a dice string into the dice expression and its trailing comment.
 * Comments are preceded by whitespace and start with #, //, [, or /*.
 * The returned comment does NOT include the marker prefix.
 * @example
 * splitDiceComment("1d6 # attack") // => { dice: "1d6", comment: "attack" }
 * splitDiceComment("2d8+3") // => { dice: "2d8+3", comment: undefined }
 */
export function splitDiceComment(dice: string): { dice: string; comment: string | undefined } {
	const match = /\s+(#|\/{2}|\[|\/\*)(?<comment>.*)/i.exec(dice);
	if (!match?.groups) return { dice: dice.trimEnd(), comment: undefined };
	const comment = match.groups.comment.trim() || undefined;
	return { dice: dice.slice(0, match.index).trimEnd(), comment };
}

/**
 * Escape regex string
 * @param string {string}
 */
export function escapeRegex(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Allow to keep the text as if in brackets
 * @param dice {string}
 * @return {string} the dice with the text in brackets as if, but the dice (not in brackets) is standardized
 */
export function standardizeDice(dice: string): string {
	return dice.replace(/(\[[^\]]+])|([^[]+)/g, (_match, insideBrackets, outsideText) =>
		insideBrackets ? insideBrackets : outsideText.standardize().replaceAll("df", "dF")
	);
}

/**
 * Verify if a value is a number, even if it's a "number" string
 * @param value {unknown}
 * @returns {boolean}
 */
export function isNumber(value: unknown): boolean {
	return (
		value !== undefined &&
		(typeof value === "number" ||
			(!Number.isNaN(Number(value)) &&
				typeof value === "string" &&
				value.trim().length > 0))
	);
}

/**
 * Replace the `{exp}` in the dice.
 * If the `{exp}` has a default value in the form of `{exp || defaultValue}`, it will be replaced by the default value.
 * @param {string} dice
 * @param engine
 * @returns {string} the dice with the {exp} replaced by a random value
 */
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

/**
 * Utility function to get a random integer between min and max and using the specified engine
 * @param min {number}
 * @param max {number}
 * @param engine {Engine | null} Engine to use, default to nodeCrypto
 * @param rng {Random | undefined} Random instance to use, see https://www.npmjs.com/package/random-js#usage
 * @returns {number} Random integer between min and max
 */
export function randomInt(
	min: number,
	max: number,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	rng?: Random
): number {
	if (!rng) rng = new Random(engine || undefined);
	return rng.integer(min, max);
}

/**
 * Allow to replace the compare part of a dice and use the critical customized one
 * @example
 * dice = "1d20=20";
 * custom critical {sign: ">", value: "$/2"}
 * Random stats = 6
 * result = "1d20>3"
 */
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
