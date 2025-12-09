import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import {
	COMMENT_REGEX,
	type Compare,
	type ComparedValue,
	type CustomCritical,
	DETECT_CRITICAL,
	DiceTypeError,
	diceTypeRandomParse,
	isNumber,
	type Modifier,
	OPTIONAL_COMMENT,
	type Resultat,
	replaceFormulaInDice,
	SIGN_REGEX,
	SIGN_REGEX_SPACE,
	type Sign,
	type StatisticalTemplate,
	SYMBOL_DICE,
	standardizeDice,
} from ".";

function getCompare(
	dice: string,
	compareRegex: RegExpMatchArray,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
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
	if (dice.match(/((\{.*,(.*)+\}|([><=!]+\d+f))[><=!]+\d+\}?)|\{(.*)([><=!]+).*\}/))
		return { dice, compare: undefined };
	dice = dice.replace(SIGN_REGEX_SPACE, "");
	let compare: ComparedValue;
	const calc = compareRegex[1];
	const sign = calc.match(/[+-/*^]/)?.[0];
	const compareSign = compareRegex[0].match(SIGN_REGEX)?.[0];

	if (sign) {
		const toCalc = calc.replace(SIGN_REGEX, "").replace(/\s/g, "").replace(/;(.*)/, "");
		const rCompare = rollCompare(toCalc, engine);
		const total = evaluate(rCompare.value.toString());
		dice = dice.replace(SIGN_REGEX_SPACE, `${compareSign}${total}`);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: total,
			originalDice: rCompare.dice,
			rollValue: rCompare.diceResult,
		};
	} else {
		const rcompare = rollCompare(calc, engine);
		compare = {
			sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
			value: rcompare.value,
			originalDice: rcompare.dice,
			rollValue: rcompare.diceResult,
		};
	}
	return { dice, compare };
}

function rollCompare(
	value: unknown,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	if (isNumber(value)) return { value: Number.parseInt(value as string, 10) };
	const rollComp = roll(value as string, engine);
	if (!rollComp?.total)
		//not a dice throw
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
export function roll(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): Resultat | undefined {
	//parse dice string
	dice = standardizeDice(replaceFormulaInDice(dice))
		.replace(/^\+/, "")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimStart();
	if (!dice.includes("d")) return undefined;
	dice = dice.replaceAll(DETECT_CRITICAL, "").trimEnd();
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let compare: ComparedValue | undefined;
	if (dice.includes(";")) return sharedRolls(dice, engine);
	if (compareRegex) {
		const compareResult = getCompare(dice, compareRegex, engine);
		dice = compareResult.dice;
		compare = compareResult.compare;
	}
	dice = fixParenthesis(dice);
	const modificator = getModifier(dice);
	if (dice.match(/\d+?#(.*)/)) {
		const diceArray = dice.split("#");
		const numberOfDice = Number.parseInt(diceArray[0], 10);
		const diceToRoll = diceArray[1].replace(COMMENT_REGEX, "");
		const commentsMatch = diceArray[1].match(COMMENT_REGEX);
		const comments = commentsMatch ? commentsMatch[2] : undefined;
		const roller = new DiceRoller();
		NumberGenerator.generator.engine = engine;
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
	NumberGenerator.generator.engine = engine;
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

function fixParenthesis(dice: string) {
	//dice with like 1d(20) are not valid, we need to remove the parenthesis
	//warning: the 1d(20+5) is valid and should not be changed
	const parenthesisRegex = /d\((\d+)\)/g;
	return dice.replaceAll(parenthesisRegex, (_match, p1) => `d${p1}`);
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
	res: boolean,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
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
		const evaluateRoll = roll(compareResult.dice, engine) as Resultat | undefined;
		if (evaluateRoll)
			return `${validSign} ${diceAll}: ${evaluateRoll.result.split(":").splice(1).join(":")}`;

		return `${validSign} ${diceAll}: ${formule} = ${evaluateRoll}${invertedSign}${compareResult.compare?.value}`;
	}
}

function compareSignFormule(
	toRoll: string,
	compareRegex: RegExpMatchArray,
	element: string,
	diceResult: Resultat,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	let results = "";
	const compareResult = getCompare(toRoll, compareRegex, engine);
	const toCompare = `${compareResult.dice}${compareResult.compare?.sign}${compareResult.compare?.value}`;
	let res: unknown;
	try {
		res = evaluate(toCompare);
	} catch (error) {
		res = roll(toCompare, engine);
	}
	if (typeof res === "boolean") {
		results = replaceInFormula(element, diceResult, compareResult, res, engine);
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
		formule: element.replace(SYMBOL_DICE, `[${total}]`).replace(/%.*%/g, "").trim(),
		diceAll: element
			.replace(SYMBOL_DICE, `[${dice.replace(COMMENT_REGEX, "")}]`)
			.replace(/%.*%/g, "")
			.trim(),
	};
}

function formatComment(dice: string) {
	const commentsRegex = /\[(?<comments>.*?)\]/;
	const commentsMatch = commentsRegex.exec(dice);
	//search for optional comments too
	const optionalComments = OPTIONAL_COMMENT.exec(dice);
	const comments = commentsMatch?.groups?.comments
		? `${commentsMatch.groups.comments}`
		: "";
	const optional = optionalComments?.groups?.comment
		? `${optionalComments.groups.comment.trim()}`
		: "";
	//fusion of both comments with a space if both exists
	//result expected = "__comment1 comment2__ — "
	//or "__comment1__ — " or "__comment2__ — "
	let finalComment = "";
	if (comments && optional)
		finalComment = `__${commentsMatch?.groups?.comments} ${optionalComments?.groups?.comment.trim()}__ — `;
	else if (comments) finalComment = `__${comments}__ — `;
	else if (optional) finalComment = `__${optional}__ — `;
	return finalComment;
}

function sharedRolls(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): Resultat | undefined {
	if (dice.match(/\d+?#(.*?)/))
		throw new DiceTypeError(
			dice,
			"noBulkRoll",
			"bulk roll are not allowed in shared rolls"
		);
	const results = [];
	const mainComment =
		/\s+#(?<comment>.*)/.exec(dice)?.groups?.comment?.trimEnd() ?? undefined;
	const split = dice.split(";");
	let diceMain = fixParenthesis(split[0]);
	const toHideRegex = /(?<!\[[^\]]*)\((?<dice>[^)]+)\)/;
	const toHide = toHideRegex.exec(diceMain)?.groups;
	let hidden = false;
	if (toHide?.dice) {
		diceMain = toHide.dice;
		hidden = true;
	} else if (toHide) {
		diceMain = "1d1";
		hidden = true;
	}
	const commentsRegex = /\[(?<comments>.*?)\]/gi;
	const comments = formatComment(diceMain);
	diceMain = diceMain.replace(commentsRegex, "").trim();
	console.log("Dice main:", diceMain);
	let diceResult = roll(diceMain, engine);
	if (!diceResult || !diceResult.total) {
		if (hidden) {
			diceResult = roll(fixParenthesis(split[0]));
			hidden = false;
		} else return undefined;
	}
	if (!diceResult || !diceResult.total) return undefined;
	results.push(`※ ${comments}${diceResult.result}`);
	let total = diceResult.total;
	diceResult.comment = mainComment;
	if (!total) return diceResult;
	for (let element of split.slice(1)) {
		const comment = formatComment(element);
		console.log(element);
		element = element
			.replaceAll(commentsRegex, "")
			.replaceAll(OPTIONAL_COMMENT, "")
			.trim();
		console.log("Element to roll:", element);
		let toRoll = element.replace(SYMBOL_DICE, `${diceResult.total}`);
		//remove comments
		const compareRegex = toRoll.match(SIGN_REGEX_SPACE);
		if (compareRegex) {
			const compareResult = compareSignFormule(
				toRoll,
				compareRegex,
				element,
				diceResult,
				engine
			);
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
				results.push(`◈ ${comment}${diceAll}: ${formule} = ${evaluated}`);
				total += Number.parseInt(evaluated, 10);
			} catch (error) {
				const evaluated = roll(toRoll, engine);
				if (evaluated)
					results.push(
						`◈ ${comment}${diceAll}: ${evaluated.result.split(":").slice(1).join(":")}`
					);
				else results.push(`◈ ${comment}${diceAll}: ${formule} = ${evaluated}`);
				total += evaluated?.total ?? 0;
			}
		}
	}
	if (hidden)
		//remove the first in result
		results.shift();
	return {
		dice: diceMain,
		result: results.join(";"),
		comment: mainComment,
		compare: diceResult.compare,
		modifier: diceResult.modifier,
		total,
	};
}
