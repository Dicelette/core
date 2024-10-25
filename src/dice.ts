/* eslint-disable no-useless-escape */
import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";

import type { Compare, Modifier, Resultat, Sign } from ".";
import { DiceTypeError } from "./errors";

export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(.*)/;
const SIGN_REGEX = /[><=!]+/;
const SIGN_REGEX_SPACE = /[><=!]+(\S+)/;

function getCompare(dice: string, compareRegex: RegExpMatchArray): {dice: string; compare: Compare | undefined} {
	//biome-ignore lint/style/noParameterAssign: I need to assign the value to the variable
	dice = dice.replace(SIGN_REGEX_SPACE, "");
	let compare: Compare;
	const calc = compareRegex[1];
	const sign = calc.match(/[+-\/\*\^]/)?.[0];
	const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];
	if (sign) {
		const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "").replace(/;(.*)/, "");
		const total = evaluate(toCalc);
		//biome-ignore lint/style/noParameterAssign: I need to assign the value to the variable
		dice = dice.replace(SIGN_REGEX_SPACE, `${compareSign}${total}`);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: total,
		};
	} else
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: Number.parseInt(calc, 10),
		};
	return {dice, compare};
}

function getModifier(dice: string) {
	const modifier = dice.matchAll(/(\+|\-|%|\/|\^|\*|\*{2})(\d+)/gi);
	let modificator: Modifier | undefined;
	for (const mod of modifier) {
		//calculate the modifier if multiple
		if (modificator) {
			const sign = modificator.sign;
			let value = modificator.value;
			if (sign) value = calculator(sign, value, Number.parseInt(mod[2], 10));
			modificator = {
				sign: mod[1] as Sign,
				value,
			};
		} else {
			modificator = {
				sign: mod[1] as Sign,
				value: Number.parseInt(mod[2], 10),
			};
		}
	}
	return modificator;
}

/**
 * Parse the string provided and turn it as a readable dice for dice parser
 * @param dice {string}
 */
export function roll(dice: string): Resultat | undefined {
	//parse dice string
	if (!dice.includes("d")) return undefined;
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let compare: Compare | undefined;
	if (dice.includes(";") && dice.includes("µ")) return multipleFunction(dice);
	if (compareRegex) {
		const compareResult = getCompare(dice, compareRegex);
		//biome-ignore lint/style/noParameterAssign: I need to assign the value to the variable
		dice = compareResult.dice;
		compare = compareResult.compare;
	}
	const modificator = getModifier(dice);

	if (dice.match(/\d+?#(.*)/)) {
		const diceArray = dice.split("#");
		const numberOfDice = Number.parseInt(diceArray[0], 10);
		const diceToRoll = diceArray[1].replace(COMMENT_REGEX, "");
		const commentsMatch = diceArray[1].match(COMMENT_REGEX);
		const comments = commentsMatch ? commentsMatch[2] : undefined;
		const roller = new DiceRoller();
		//remove comments if any
		for (let i = 0; i < numberOfDice; i++) {
			try {
				roller.roll(diceToRoll);
			} catch (error) {
				throw new DiceTypeError(diceToRoll, "roll", error);
			}
		}
		return {
			dice: diceToRoll,
			result: roller.output,
			comment: comments,
			compare: compare ? compare : undefined,
			modifier: modificator,
			total: roller.total,
		};
	}
	const roller = new DiceRoller();
	const diceWithoutComment = dice.replace(COMMENT_REGEX, "");
	try {
		roller.roll(diceWithoutComment);
	} catch (error) {
		throw new DiceTypeError(diceWithoutComment, "roll", error);
	}
	const commentMatch = dice.match(COMMENT_REGEX);
	const comment = commentMatch ? commentMatch[2] : undefined;
	return {
		dice,
		result: roller.output,
		comment,
		compare: compare ? compare : undefined,
		modifier: modificator,
		total: roller.total,
	};
}
/**
 * Evaluate a formula and replace "^" by "**" if any
 * @param {Sign} sign
 * @param {number} value
 * @param {number} total
 * @returns
 */
export function calculator(sign: Sign, value: number, total: number): number {
	//biome-ignore lint/style/noParameterAssign: I need to assign the value to the variable
	if (sign === "^") sign = "**";
	return evaluate(`${total} ${sign} ${value}`);
}

function compareResult(result: number, compare: Compare): boolean {
	switch (compare.sign) {
		case "<":
			return result < compare.value;
		case ">":
			return result > compare.value;
		case "<=":
			return result <= compare.value;
		case ">=":
			return result >= compare.value;
		case "=":
			return result === compare.value;
		case "==":
			return result === compare.value;
		case "!=":
			return result !== compare.value;
	}
}

function inverseSign(sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "=="): "<" | ">" | ">=" | "<=" | "=" | "!=" | "==" {
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

export function multipleFunction(dice: string): Resultat | undefined {
	const results = [];
	const split = dice.split(";");
	const diceResult = roll(split[0]);
	if (!diceResult || !diceResult.total) return undefined;
	results.push(`${diceResult.result}`);
	
	let total = diceResult.total;
	let comments = diceResult.comment ?? "";
	if (!total) return diceResult;
	for (let element of split.slice(1)) {
		if (!element.includes("µ")) {
			const result = roll(element);
			if (!result) continue;
			results.push(result.result);
			continue;
		}
		//remove comments & keep it
		const commentMatch = element.match(COMMENT_REGEX);
		element = element.replace(COMMENT_REGEX, "");
		const comment = commentMatch ? commentMatch[2] : undefined;
		if (comment) comments += ` ${comment}`;
		let toRoll = element.replace("µ", `${diceResult.total}`);
		let resultat: number;
		const compareRegex = toRoll.match(SIGN_REGEX_SPACE);
		if (compareRegex) {
			const compareResult = getCompare(toRoll, compareRegex);
			resultat = compareResult.compare!.value;
			toRoll = compareResult.dice;
			const toCompare = `${toRoll}${compareResult.compare?.sign}${compareResult.compare?.value}`;
			const res = evaluate(toCompare);
			if (typeof res === "boolean") {
				const formule = element.replace("µ", `[${diceResult.total}]`);
				const diceAll = element.replace("µ", diceResult.dice.replace(COMMENT_REGEX, ""));
				const validSign = res ? "✓" : "✕";
				const invertedSign = res ? compareResult.compare!.sign : inverseSign(compareResult.compare!.sign);
				results.push(`${validSign} ${diceAll}: ${formule} = ${evaluate(toRoll)}${invertedSign}${compareResult.compare?.value}`);
			}
		} else {
			resultat = evaluate(toRoll);
			const formule = element.replace("µ", `[${diceResult.total}]`);
			const diceAll = element.replace("µ", diceResult.dice.replace(COMMENT_REGEX, ""));
			results.push(`◈ ${diceAll}: ${formule} = ${resultat}`);
		}
		total += resultat;
	}

	return {
			dice: split[0],
			result: results.join(";"),
			comment: comments,
			compare: diceResult.compare,
			modifier: diceResult.modifier,
			total
		}
	
}
