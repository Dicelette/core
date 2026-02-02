import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import { DiceTypeError } from "../errors";
import type { Compare, ComparedValue, Resultat, SortOrder } from "../interfaces";
import { COMMENT_REGEX, SIGN_REGEX, SIGN_REGEX_SPACE } from "../interfaces/constant";
import { isTrivialComparison } from "./compare";
import {
	countExplodingSuccesses,
	EXPLODING_SUCCESS_REGEX,
	type ExplodingSuccess,
} from "./exploding";
import {
	extractValuesFromOutput,
	getModifier,
	getSortOrder,
	setSortOrder,
} from "./extract";
import { replaceUnwantedText } from "./replace";
import { matchComparison } from "./signs";

/**
 * Gère les lancers en masse (bulk rolls)
 */
export function handleBulkRolls(
	dice: string,
	isCurlyBulk: boolean,
	bulkContent: string,
	compare: ComparedValue | undefined,
	explodingSuccess: ExplodingSuccess | undefined,
	diceDisplay: string,
	engine: Engine | null,
	sort?: SortOrder
): Resultat {
	const bulkProcessContent = isCurlyBulk ? bulkContent : dice;
	const diceArray = bulkProcessContent.split("#");
	const numberOfDice = Number.parseInt(diceArray[0], 10);
	let diceToRoll = diceArray[1].replace(COMMENT_REGEX, "");
	const commentsMatch = diceArray[1].match(COMMENT_REGEX);
	const comments = commentsMatch ? commentsMatch[2] : undefined;

	let curlyCompare: Compare | undefined;
	if (isCurlyBulk) {
		const curlyCompareRegex = diceToRoll.match(SIGN_REGEX_SPACE);
		if (curlyCompareRegex) {
			const compareSign = curlyCompareRegex[0].match(SIGN_REGEX)?.[0];
			const compareValue = curlyCompareRegex[2];
			if (compareSign && compareValue) {
				curlyCompare = {
					sign: compareSign as "<" | ">" | ">=" | "<=" | "=" | "!=" | "==",
					value: Number.parseInt(compareValue, 10),
				};
				diceToRoll = diceToRoll.replace(SIGN_REGEX_SPACE, "");
			}
		}
	}

	sort = sort ?? getSortOrder(diceToRoll);
	diceToRoll = setSortOrder(diceToRoll, sort);

	const activeCompare: Compare | undefined =
		compare ||
		curlyCompare ||
		(explodingSuccess
			? ({ sign: explodingSuccess.sign, value: explodingSuccess.value } as Compare)
			: undefined);

	if (activeCompare) {
		return handleBulkRollsWithComparison(
			numberOfDice,
			diceToRoll,
			comments,
			activeCompare,
			explodingSuccess,
			diceDisplay,
			isCurlyBulk,
			curlyCompare,
			compare,
			engine,
			sort
		);
	}

	const roller = new DiceRoller();
	NumberGenerator.generator.engine = engine;

	for (let i = 0; i < numberOfDice; i++) {
		try {
			roller.roll(diceToRoll);
		} catch (error) {
			throw new DiceTypeError(diceToRoll, "roll", error);
		}
	}

	const finalDice = isCurlyBulk ? `{${diceToRoll}}` : diceToRoll;
	const modificator = getModifier(dice);

	return {
		dice: finalDice,
		result: replaceUnwantedText(roller.output, sort),
		comment: comments,
		compare: compare ? compare : undefined,
		modifier: modificator,
		total: roller.total,
	};
}

/**
 * Gère les lancers en masse avec comparaison
 */
function handleBulkRollsWithComparison(
	numberOfDice: number,
	diceToRoll: string,
	comments: string | undefined,
	activeCompare: Compare,
	explodingSuccess: ExplodingSuccess | undefined,
	diceDisplay: string,
	isCurlyBulk: boolean,
	curlyCompare: Compare | undefined,
	compare: ComparedValue | undefined,
	engine: Engine | null,
	sort: SortOrder | undefined
): Resultat {
	const results: string[] = [];
	let successCount = 0;
	const roller = new DiceRoller();
	NumberGenerator.generator.engine = engine;
	let trivialComparisonDetected = false;

	const formatOutput = (output: string, addStar: boolean) => {
		const formatted =
			addStar && isCurlyBulk
				? output.replace(
						/\[([^\]]+)\]/,
						(_m, content) =>
							`[${content
								.split(",")
								.map((d: string) => `${d.trim()}*`)
								.join(", ")}]`
					)
				: output;
		return curlyCompare
			? formatted.replace(/^([^:]+):/, `$1${curlyCompare.sign}${curlyCompare.value}:`)
			: formatted;
	};

	for (let i = 0; i < numberOfDice; i++) {
		try {
			const individualRoll = roller.roll(diceToRoll);
			const rollInstance = Array.isArray(individualRoll)
				? individualRoll[0]
				: individualRoll;

			if (!trivialComparisonDetected && activeCompare) {
				const { maxTotal, minTotal } = rollInstance;
				trivialComparisonDetected = isTrivialComparison(
					maxTotal,
					minTotal,
					activeCompare
				);
			}

			const rollOutput = rollInstance.output;

			if (explodingSuccess) {
				const successesForRoll = countExplodingSuccesses(
					rollInstance,
					explodingSuccess.sign,
					explodingSuccess.value
				);
				successCount += successesForRoll;

				let formattedRollOutput = rollOutput
					.replace(explodingSuccess.normalizedSegment, explodingSuccess.originalSegment)
					.replace(/=\s*-?\d+(?:\.\d+)?$/, `= ${successesForRoll}`);
				formattedRollOutput = formatOutput(formattedRollOutput, false);
				results.push(formattedRollOutput);
			} else {
				const rollTotal = rollInstance.total;
				const isSuccess = evaluate(
					`${rollTotal}${activeCompare.sign}${activeCompare.value}`
				);

				if (isSuccess) successCount++;
				results.push(formatOutput(rollOutput, isSuccess));
			}
		} catch (error) {
			throw new DiceTypeError(diceToRoll, "roll", error);
		}
	}

	if (explodingSuccess) {
		const signSource = explodingSuccess?.originalDice ?? diceDisplay;
		const explodingMatch = signSource.match(EXPLODING_SUCCESS_REGEX);
		if (explodingMatch) {
			const [, doubledSignRaw, valueStr] = explodingMatch;
			let doubledSign: string;
			if (doubledSignRaw === "!!==") doubledSign = "==";
			else if (doubledSignRaw === "!==") doubledSign = "!==";
			else doubledSign = doubledSignRaw.replace(/^!/, "");

			const signMap: Record<string, Compare["sign"]> = {
				">>": ">",
				"<<": "<",
				">=": ">=",
				"<=": "<=",
				"==": "=",
				"!==": "!=",
				"!!==": "=",
			};
			const mappedSign = signMap[doubledSign];
			const mappedValue = Number.parseFloat(valueStr);

			if (mappedSign && !Number.isNaN(mappedValue)) {
				const resultsString = replaceUnwantedText(results.join("; "));
				const flatValues = resultsString
					.split(";")
					.flatMap((segment) => extractValuesFromOutput(segment));

				if (mappedSign === "!=") {
					const equalsCount = flatValues.filter((val) => val === mappedValue).length;
					successCount = flatValues.length - equalsCount;
				} else {
					successCount = flatValues.filter((val) =>
						matchComparison(mappedSign, val, mappedValue)
					).length;
				}
			}
		}
	}

	if (compare && trivialComparisonDetected) compare.trivial = true;

	const finalDice = isCurlyBulk
		? `{${diceToRoll}${curlyCompare?.sign}${curlyCompare?.value}}`
		: diceToRoll;

	const resultOutput = replaceUnwantedText(results.join("; "), sort);
	const finalTotal = explodingSuccess
		? resultOutput
				.split(";")
				.flatMap((segment) => extractValuesFromOutput(segment))
				.filter((val) =>
					matchComparison(explodingSuccess.sign, val, explodingSuccess.value)
				).length
		: successCount;

	const modificator = getModifier(diceDisplay);

	return {
		dice: explodingSuccess ? diceDisplay : finalDice,
		result: resultOutput,
		comment: comments,
		compare: isCurlyBulk ? undefined : compare,
		modifier: modificator,
		total: finalTotal,
		trivial: trivialComparisonDetected ? true : undefined,
	};
}
