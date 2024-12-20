import { DiceRoller } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";

import {
	type Compare,
	type ComparedValue,
	type CustomCritical,
	type Modifier,
	type Resultat,
	type Sign,
	type StatisticalTemplate,
	diceTypeRandomParse,
} from ".";
import { DiceTypeError } from "./errors";
import {
	COMMENT_REGEX,
	SIGN_REGEX,
	SIGN_REGEX_SPACE,
	SYMBOL_DICE,
} from "./interfaces/constant";

function getCompare(
	dice: string,
	compareRegex: RegExpMatchArray
): { dice: string; compare: ComparedValue | undefined } {
	dice = dice.replace(SIGN_REGEX_SPACE, "");
	let compare: ComparedValue;
	const calc = compareRegex[1];
	const sign = calc.match(/[+-\/*^]/)?.[0];
	const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];
	if (sign) {
		const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "").replace(/;(.*)/, "");
		const rCompare = rollCompare(toCalc);
		const total = evaluate(rCompare.value.toString());
		dice = dice.replace(SIGN_REGEX_SPACE, `${compareSign}${total}`);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: total,
			originalDice: rCompare.dice,
			rollValue: rCompare.diceResult,
		};
	} else {
		const rcompare = rollCompare(calc);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: rcompare.value,
			originalDice: rcompare.dice,
			rollValue: rcompare.diceResult,
		};
	}
	return { dice, compare };
}

function rollCompare(value: unknown) {
	const isNumber = (value: unknown): boolean =>
		typeof value === "number" ||
		(!Number.isNaN(Number(value)) && typeof value === "string");
	if (isNumber(value)) return { value: Number.parseInt(value as string, 10) };
	const rollComp = roll(value as string);
	if (!rollComp?.total) //not a dice throw
		return { value: evaluate(value as string), diceResult: value as string };
	return {
		dice: value as string,
		value: rollComp.total,
		diceResult: rollComp?.result,
	};
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
	template: StatisticalTemplate
) {
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let customDice = dice;
	const compareValue = diceTypeRandomParse(customCritical.value, template);
	if (compareValue.includes("$"))
		throw new DiceTypeError(compareValue, "createCriticalCustom");
	const comparaison = `${customCritical.sign}${compareValue}`;
	if (compareRegex) customDice = customDice.replace(SIGN_REGEX_SPACE, comparaison);
	else customDice += comparaison;
	return diceTypeRandomParse(customDice, template);
}

function getModifier(dice: string) {
	const modifier = dice.matchAll(/(\+|-|%|\/|\^|\*|\*{2})(\d+)/gi);
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
	let compare: ComparedValue | undefined;
	if (dice.includes(";")) return sharedRolls(dice);
	if (compareRegex) {
		const compareResult = getCompare(dice, compareRegex);
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
	const diceWithoutComment = dice.replace(COMMENT_REGEX, "").trimEnd();
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
	if (sign === "^") sign = "**";
	return evaluate(`${total} ${sign} ${value}`);
}

function inverseSign(
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

function replaceInFormula(
	element: string,
	diceResult: Resultat,
	compareResult: { dice: string; compare: Compare | undefined },
	res: boolean
) {
	const { formule, diceAll } = replaceText(
		element,
		diceResult.total ?? 0,
		diceResult.dice
	);
	const validSign = res ? "✓" : "✕";
	const invertedSign = res
		? compareResult.compare!.sign
		: inverseSign(compareResult.compare!.sign);
	let evaluateRoll: unknown;
	try {
		evaluateRoll = evaluate(compareResult.dice);
		return `${validSign} ${diceAll}: ${formule} = ${evaluateRoll}${invertedSign}${compareResult.compare?.value}`;
	} catch (error) {
		const evaluateRoll = roll(compareResult.dice) as Resultat | undefined;
		if (evaluateRoll)
			return `${validSign} ${diceAll}: ${evaluateRoll.result.split(":").splice(1).join(":")}`;

		return `${validSign} ${diceAll}: ${formule} = ${evaluateRoll}${invertedSign}${compareResult.compare?.value}`;
	}
}

function compareSignFormule(
	toRoll: string,
	compareRegex: RegExpMatchArray,
	element: string,
	diceResult: Resultat
) {
	let results = "";
	const compareResult = getCompare(toRoll, compareRegex);
	const toCompare = `${compareResult.dice}${compareResult.compare?.sign}${compareResult.compare?.value}`;
	let res: unknown;
	try {
		res = evaluate(toCompare);
	} catch (error) {
		res = roll(toCompare);
	}
	if (typeof res === "boolean") {
		results = replaceInFormula(element, diceResult, compareResult, res);
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
		}
	}
	return { dice: compareResult.dice, results };
}

function replaceText(element: string, total: number, dice: string) {
	return {
		formule: element.replace(SYMBOL_DICE, `[${total}]`).trim(),
		diceAll: element.replace(SYMBOL_DICE, `[${dice.replace(COMMENT_REGEX, "")}]`).trim(),
	};
}

function sharedRolls(dice: string): Resultat | undefined {
	/* bulk roll are not allowed in shared rolls */
	if (dice.includes("#"))
		throw new DiceTypeError(
			dice,
			"noBulkRoll",
			"bulk roll are not allowed in shared rolls"
		);
	const results = [];
	const split = dice.split(";");
	let diceMain = split[0];
	const toHideRegex = /\((?<dice>.*)\)/
	const toHide = diceMain.match(toHideRegex);
	let hidden = false;
	if (toHide?.groups?.dice) {
		diceMain = toHide.groups.dice;
		hidden = true;
	}
	const diceResult = roll(diceMain);
	if (!diceResult || !diceResult.total) return undefined;
	results.push(`${diceResult.result}`);

	let total = diceResult.total;
	let comments = diceResult.comment ?? "";
	if (!total) return diceResult;
	for (let element of split.slice(1)) {
		if (!element.includes(SYMBOL_DICE)) {
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
		let toRoll = element.replace(SYMBOL_DICE, `${diceResult.total}`);
		const compareRegex = toRoll.match(SIGN_REGEX_SPACE);
		if (compareRegex) {
			const compareResult = compareSignFormule(toRoll, compareRegex, element, diceResult);
			toRoll = compareResult.dice;
			results.push(compareResult.results);
		} else {
			const { formule, diceAll } = replaceText(
				element,
				diceResult.total,
				diceResult.dice
			);

			try {
				const evaluated = evaluate(toRoll);
				results.push(`◈ ${diceAll}: ${formule} = ${evaluated}`);
				total += Number.parseInt(evaluated, 10);
			} catch (error) {
				const evaluated = roll(toRoll);
				if (evaluated)
					results.push(`◈ ${diceAll}: ${evaluated.result.split(":").slice(1).join(":")}`);
				else results.push(`◈ ${diceAll}: ${formule} = ${evaluated}`);
				total += evaluated?.total ?? 0;
			}
		}
	}
	if (hidden) //remove the first in result
		results.shift();
	return {
		dice: diceMain,
		result: results.join(";"),
		comment: comments,
		compare: diceResult.compare,
		modifier: diceResult.modifier,
		total,
	};
}
