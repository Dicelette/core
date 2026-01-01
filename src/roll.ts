import { type DiceRoll, DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";

import {
	compareSignFormule,
	countExplodingSuccesses,
	type ExplodingSuccess,
	extractValuesFromOutput,
	fixParenthesis,
	formatComment,
	getCompare,
	getModifier,
	getRollBounds,
	handleBulkRolls,
	handlePitySystem,
	inverseSign,
	isTrivialComparison,
	matchComparison,
	normalizeExplodingSuccess,
	prepareDice,
	replaceText,
	replaceUnwantedText,
	setSortOrder,
} from "./dice";
import { DiceTypeError } from "./errors";
import { type Compare, type ComparedValue, type Resultat, SortOrder } from "./interfaces";
import {
	COMMENT_REGEX,
	OPTIONAL_COMMENT,
	SIGN_REGEX_SPACE,
	SYMBOL_DICE,
} from "./interfaces/constant";

/**
 * Parse the string provided and turn it as a readable dice for dice parser
 * @param {string} dice The dice string to parse and roll
 * @param {Engine|null} engine The random engine to use, default to nodeCrypto
 * @param {boolean} pity Whether to enable pity system (reroll on failure) or not
 * @param {boolean} sort Whether to sort the dice results or not
 * @returns {Resultat|undefined} The result of the roll
 */
export function roll(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean,
	sort?: SortOrder
): Resultat | undefined {
	if (sort === SortOrder.None) sort = undefined;

	const prepared = prepareDice(dice);
	if (!prepared.dice.includes("d")) return undefined;

	// Handle shared rolls
	if (prepared.isSharedRoll) {
		return sharedRolls(
			prepared.dice,
			engine,
			pity,
			prepared.explodingSuccess,
			prepared.diceDisplay,
			prepared.isSharedCurly
		);
	}

	let processedDice = fixParenthesis(prepared.dice);
	const modificator = getModifier(processedDice);

	// Extract compare BEFORE rolling, but NOT for curly bulk rolls
	const compareRegex = processedDice.match(SIGN_REGEX_SPACE);
	let compare: ComparedValue | undefined;
	if (compareRegex && !prepared.isCurlyBulk) {
		const compareResult = getCompare(processedDice, compareRegex, engine, pity);
		processedDice = compareResult.dice;
		compare = compareResult.compare;
	}

	// Handle bulk rolls
	const bulkProcessContent = prepared.isCurlyBulk ? prepared.bulkContent : processedDice;
	if (bulkProcessContent.match(/\d+?#(.*)/)) {
		return handleBulkRolls(
			processedDice,
			prepared.isCurlyBulk,
			prepared.bulkContent,
			compare,
			prepared.explodingSuccess,
			prepared.diceDisplay,
			engine,
			sort
		);
	}

	// Standard roll
	const roller = new DiceRoller();
	NumberGenerator.generator.engine = engine;
	let diceWithoutComment = processedDice.replace(COMMENT_REGEX, "").trimEnd();
	diceWithoutComment = setSortOrder(diceWithoutComment, sort);

	let diceRoll: DiceRoll | DiceRoll[];
	try {
		diceRoll = roller.roll(diceWithoutComment);
	} catch (error) {
		throw new DiceTypeError(diceWithoutComment, "roll", error);
	}

	// Update compare.trivial after rolling
	if (compare && diceRoll) {
		const currentRoll = Array.isArray(diceRoll) ? diceRoll[0] : diceRoll;
		const trivial = isTrivialComparison(
			currentRoll.maxTotal,
			currentRoll.minTotal,
			compare
		);
		compare.trivial = trivial ? true : undefined;
	}

	const commentMatch = processedDice.match(COMMENT_REGEX);
	const comment = commentMatch ? commentMatch[2] : undefined;

	// Handle pity system
	let rerollCount = 0;
	let pityResult: Resultat | undefined;
	if (pity && compare) {
		const pityData = handlePitySystem(
			diceWithoutComment,
			compare,
			diceRoll,
			roller,
			engine
		);
		rerollCount = pityData.rerollCount;
		pityResult = pityData.result;
		if (pityResult) {
			return {
				...pityResult,
				dice: processedDice,
				comment,
				compare,
				modifier: modificator,
				pityLogs: rerollCount,
				trivial: pityResult.trivial ?? (compare?.trivial ? true : undefined),
			};
		}
	}

	let resultOutput = replaceUnwantedText(roller.output);

	// Handle exploding success
	if (prepared.explodingSuccess) {
		const successes = countExplodingSuccesses(
			diceRoll,
			prepared.explodingSuccess.sign,
			prepared.explodingSuccess.value
		);
		resultOutput = resultOutput
			.replace(/=\s*-?\d+(?:\.\d+)?$/, `= ${successes}`)
			.replace(
				prepared.explodingSuccess.normalizedSegment,
				prepared.explodingSuccess.originalSegment
			);

		return {
			dice: prepared.diceDisplay,
			result: resultOutput,
			comment,
			compare: compare ? compare : undefined,
			modifier: modificator,
			total: successes,
			pityLogs: rerollCount > 0 ? rerollCount : undefined,
			trivial: compare?.trivial ? true : undefined,
		};
	}

	return {
		dice: processedDice,
		result: resultOutput,
		comment,
		compare: compare ? compare : undefined,
		modifier: modificator,
		total: roller.total,
		pityLogs: rerollCount > 0 ? rerollCount : undefined,
		trivial: compare?.trivial ? true : undefined,
	};
}

function sharedRolls(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean,
	explodingSuccessMain?: ExplodingSuccess,
	diceDisplay?: string,
	isSharedCurly?: boolean
): Resultat | undefined {
	// If not provided (call from elsewhere), try to detect
	if (!explodingSuccessMain)
		explodingSuccessMain = normalizeExplodingSuccess(dice.split(";")[0] ?? dice);

	if (explodingSuccessMain) {
		// Use normalized dice for internal processing but keep original for display
		dice = dice.replace(explodingSuccessMain.originalSegment, "!");
	}
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
	const displayDice = diceDisplay ?? explodingSuccessMain?.originalDice ?? split[0];
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
	const rollBounds = getRollBounds(diceMain, engine);
	let diceResult = roll(diceMain, engine, pity);
	if (!diceResult || !diceResult.total) {
		if (hidden) {
			diceResult = roll(fixParenthesis(split[0]), engine, pity);
			hidden = false;
		} else return undefined;
	}
	if (!diceResult || !diceResult.total) return undefined;

	// If we had a double-sign exploding, recompute successes from the first segment output
	if (explodingSuccessMain && diceResult.result) {
		const values = extractValuesFromOutput(diceResult.result);
		diceResult.total = values.filter((v) =>
			matchComparison(explodingSuccessMain!.sign, v, explodingSuccessMain!.value)
		).length;
	}
	let aggregatedCompare = diceResult.compare;
	let hasTrivialComparison = diceResult.compare?.trivial === true;
	results.push(`※ ${comments}${diceResult.result}`);
	let total = diceResult.total;
	diceResult.comment = mainComment;
	if (!total) {
		return {
			dice: displayDice,
			result: results.join(";"),
			comment: mainComment,
			compare: aggregatedCompare,
			modifier: diceResult.modifier,
			total,
			trivial: hasTrivialComparison ? true : undefined,
		};
	}
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
			if (isSharedCurly) {
				// For curly braces shared rolls, display success count instead of comparison details
				const compareResult = compareSignFormule(
					toRoll,
					compareRegex,
					element,
					diceResult,
					engine,
					pity,
					rollBounds
				);
				// Count success: 1 if comparison is true, 0 if false
				const { diceAll } = replaceText(element, diceResult.total, diceResult.dice);
				let successCount = 0;
				try {
					const evaluated = evaluate(toRoll);
					successCount = evaluated ? 1 : 0;
				} catch (error) {
					// If evaluation fails, try with roll
					const evaluated = roll(toRoll, engine, pity) as Resultat | undefined;
					successCount = (evaluated?.total ?? 0) ? 1 : 0;
				}
				results.push(`※ ${comment}${diceAll}: ${successCount}`);
				total += successCount;
				if (!aggregatedCompare && compareResult.compare)
					aggregatedCompare = compareResult.compare;
				if (compareResult.trivial) hasTrivialComparison = true;
			} else {
				const compareResult = compareSignFormule(
					toRoll,
					compareRegex,
					element,
					diceResult,
					engine,
					pity,
					rollBounds
				);
				toRoll = compareResult.dice;
				results.push(compareResult.results);
				if (!aggregatedCompare && compareResult.compare)
					aggregatedCompare = compareResult.compare;
				if (compareResult.trivial) hasTrivialComparison = true;
			}
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
				if (evaluated) {
					results.push(
						`◈ ${comment}${diceAll}: ${evaluated.result.split(":").slice(1).join(":")}`
					);
					if (!aggregatedCompare && evaluated.compare)
						aggregatedCompare = evaluated.compare;
					if (evaluated.compare?.trivial) hasTrivialComparison = true;
				} else results.push(`◈ ${comment}${diceAll}: ${formule} = ${evaluated}`);
				total += evaluated?.total ?? 0;
			}
		}
	}
	if (hidden)
		//remove the first in result
		results.shift();
	return {
		dice: displayDice,
		result: results.join(";"),
		comment: mainComment,
		compare:
			hasTrivialComparison && aggregatedCompare
				? { ...aggregatedCompare, trivial: true }
				: aggregatedCompare,
		modifier: diceResult.modifier,
		total,
		trivial: hasTrivialComparison ? true : undefined,
	};
}

export function replaceInFormula(
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
