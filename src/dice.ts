import { type DiceRoll, DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
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

/**
 * Check if a comparison is trivial (always true or always false)
 * Uses the existing canComparisonSucceed logic and checks both success and failure conditions
 * @param maxValue Maximum possible value from the dice roll
 * @param minValue Minimum possible value from the dice roll
 * @param compare The comparison object
 * @returns true if the comparison is trivial (always true or always false)
 */
function isTrivialComparison(
	maxValue: number,
	minValue: number,
	compare: ComparedValue
): boolean {
	// Check if comparison can never succeed (always false)
	const canSucceed = canComparisonSucceed(maxValue, compare, minValue);

	// Check if comparison can never fail (always true) by checking the inverse with minValue
	const canFail = canComparisonFail(minValue, compare);

	// Trivial if it can never succeed OR can never fail
	return !canSucceed || !canFail;
}

/**
 * Check if a comparison can theoretically fail given a minimum roll value
 * @param minRollValue Minimum possible roll value
 * @param compare The comparison object
 * @returns true if the comparison can fail
 */
function canComparisonFail(minRollValue: number, compare: ComparedValue): boolean {
	switch (compare.sign) {
		case ">":
			return minRollValue <= compare.value;
		case ">=":
			return minRollValue < compare.value;
		case "<":
			return minRollValue >= compare.value;
		case "<=":
			return minRollValue > compare.value;
		case "=":
		case "==":
			return minRollValue !== compare.value;
		case "!=":
			return minRollValue === compare.value;
		default:
			return true;
	}
}

function getCompare(
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

function rollCompare(
	value: unknown,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
) {
	if (isNumber(value)) return { value: Number.parseInt(value as string, 10) };
	// Handle empty value or string - return 0 as default
	if (!value || (typeof value === "string" && value.trim() === "")) {
		return { value: 0, diceResult: value as string };
	}
	const rollComp = roll(value as string, engine, pity);
	if (!rollComp?.total) {
		//not a dice throw
		try {
			return { value: evaluate(value as string), diceResult: value as string };
		} catch (error) {
			// If evaluate fails, return 0
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
 * @param engine
 * @param pity
 */
export function roll(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
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

	dice = fixParenthesis(dice);
	const modificator = getModifier(dice);

	// Extract compare BEFORE rolling to remove it from the dice notation
	if (compareRegex) {
		const compareResult = getCompare(dice, compareRegex, engine, pity);
		dice = compareResult.dice;
		compare = compareResult.compare;
	}

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

	let diceRoll: DiceRoll | DiceRoll[];
	try {
		diceRoll = roller.roll(diceWithoutComment);
	} catch (error) {
		throw new DiceTypeError(diceWithoutComment, "roll", error);
	}

	// Update compare.trivial after rolling to get access to diceRoll for trivial detection
	if (compare && diceRoll) {
		const currentRoll = Array.isArray(diceRoll) ? diceRoll[0] : diceRoll;
		const maxDiceValue = currentRoll.maxTotal;
		const minDiceValue = currentRoll.minTotal;
		const trivial = isTrivialComparison(maxDiceValue, minDiceValue, compare);
		compare.trivial = trivial ? true : undefined;
	}

	const commentMatch = dice.match(COMMENT_REGEX);
	const comment = commentMatch ? commentMatch[2] : undefined;
	let rerollCount = 0;
	let res: Resultat | undefined;
	if (pity && compare) {
		// Vérifier si la comparaison est théoriquement possible
		const currentRoll = Array.isArray(diceRoll) ? diceRoll[0] : diceRoll;
		const maxPossible = currentRoll ? currentRoll.maxTotal : null;
		const isComparisonPossible =
			maxPossible === null || canComparisonSucceed(maxPossible, compare);

		if (isComparisonPossible) {
			let isFail = evaluate(`${roller.total}${compare.sign}${compare.value}`);
			if (!isFail) {
				//reroll until success
				const maxReroll = 100;
				while (!isFail && rerollCount < maxReroll) {
					try {
						res = roll(diceWithoutComment, engine, false); // désactiver pity pour éviter la récursion infinie
					} catch (error) {
						throw new DiceTypeError(diceWithoutComment, "roll", error);
					}
					rerollCount++;
					if (res && res.total !== undefined)
						isFail = evaluate(`${res.total}${compare.sign}${compare.value}`);
				}
				if (res) {
					return {
						...res,
						dice,
						comment,
						compare: compare,
						modifier: modificator,
						pityLogs: rerollCount,
					};
				}
			}
		}
		// Si la comparaison est impossible, on ignore la pity et on retourne le résultat normal
		console.log("Comparison impossible, ignoring pity reroll.");
	}
	return {
		dice,
		result: roller.output,
		comment,
		compare: compare ? compare : undefined,
		modifier: modificator,
		total: roller.total,
		pityLogs: rerollCount > 0 ? rerollCount : undefined,
	};
}

/**
 * Check if a comparison can theoretically succeed given a maximum roll value
 * @example
 * canComparisonSucceed(10, { sign: ">=", value: 15 }) => false (impossible to roll >= 15 with 1d10)
 * canComparisonSucceed(20, { sign: ">=", value: 15 }) => true (possible to roll >= 15 with 1d20)
 */
function canComparisonSucceed(
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
			return true; // != peut toujours réussir sauf cas très spécifiques
		default:
			return true;
	}
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
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
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
		const evaluateRoll = roll(compareResult.dice, engine, pity) as Resultat | undefined;
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
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
) {
	let results = "";
	const compareResult = getCompare(toRoll, compareRegex, engine);
	const toCompare = `${compareResult.dice}${compareResult.compare?.sign}${compareResult.compare?.value}`;
	let res: unknown;
	try {
		res = evaluate(toCompare);
	} catch (error) {
		res = roll(toCompare, engine, pity);
	}
	if (typeof res === "boolean") {
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
	const comments = commentsMatch?.groups?.comments
		? `${commentsMatch.groups.comments}`
		: "";

	// Search for optional comments (# or // style) only AFTER removing bracket comments
	// to avoid conflicts with parentheses inside bracket comments
	const diceWithoutBrackets = dice.replace(commentsRegex, "");
	const optionalCommentsRegex = /\s+(#|\/\/)(?<comment>.*)/;
	const optionalComments = optionalCommentsRegex.exec(diceWithoutBrackets);
	const optional = optionalComments?.groups?.comment
		? `${optionalComments.groups.comment.trim()}`
		: "";

	//fusion of both comments with a space if both exists
	//result expected = "__comment1 comment2__ — "
	//or "__comment1__ — " or "__comment2__ — "
	let finalComment = "";
	if (comments && optional) finalComment = `__${comments} ${optional}__ — `;
	else if (comments) finalComment = `__${comments}__ — `;
	else if (optional) finalComment = `__${optional}__ — `;
	return finalComment;
}

function sharedRolls(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
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
	// Extract and save the comments first to avoid conflicts with parentheses detection
	const commentsRegex = /\[(?<comments>.*?)\]/gi;
	const comments = formatComment(diceMain);
	// Remove comments before checking for hidden dice (parentheses)
	const diceMainWithoutComments = diceMain.replace(commentsRegex, "").trim();
	const toHideRegex = /\((?<dice>[^)]+)\)/;
	const toHide = toHideRegex.exec(diceMainWithoutComments)?.groups;
	let hidden = false;
	if (toHide?.dice) {
		diceMain = toHide.dice;
		hidden = true;
	} else if (toHide) {
		diceMain = "1d1";
		hidden = true;
	} else {
		// No hidden dice, use the dice without comments
		diceMain = diceMainWithoutComments;
	}
	let diceResult = roll(diceMain, engine, pity);
	if (!diceResult || !diceResult.total) {
		if (hidden) {
			diceResult = roll(fixParenthesis(split[0]), engine, pity);
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
		element = element
			.replaceAll(commentsRegex, "")
			.replaceAll(OPTIONAL_COMMENT, "")
			.trim();
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
				const evaluated = roll(toRoll, engine, pity);
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
