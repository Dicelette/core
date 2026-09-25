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
	getSortOrder,
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
	sortSharedResults,
} from "./dice";
import { DiceTypeError } from "./errors";
import {
	type Compare,
	type ComparedValue,
	OPTIONAL_COMMENT,
	type Resultat,
	SIGN_REGEX_SPACE,
	SortOrder,
	SYMBOL_DICE,
} from "./interfaces";
import { splitDiceComment } from "./utils";

/** Parses and rolls a dice string, handling shared rolls, bulk rolls, pity, and comparisons. */
export function roll(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean,
	sort?: SortOrder,
	comment?: string
): Resultat | undefined {
	if (sort === SortOrder.None) sort = undefined;

	const prepared = prepareDice(dice);
	if (!prepared.dice.includes("d")) return undefined;

	if (prepared.isSharedRoll) {
		return sharedRolls(
			prepared.dice,
			engine,
			pity,
			prepared.explodingSuccess,
			prepared.diceDisplay,
			prepared.isSharedCurly,
			sort
		);
	}

	let processedDice = fixParenthesis(prepared.dice);
	const modificator = getModifier(processedDice);

	// Must extract compare before rolling; skip for curly bulk rolls
	const compareRegex = processedDice.match(SIGN_REGEX_SPACE);
	let compare: ComparedValue | undefined;
	if (compareRegex && !prepared.isCurlyBulk) {
		const compareResult = getCompare(processedDice, compareRegex, engine, pity);
		processedDice = compareResult.dice;
		compare = compareResult.compare;
	}

	let finalDiceDisplay = prepared.diceDisplay;
	if (prepared.isSimpleCurly && !prepared.diceDisplay.startsWith("{")) {
		finalDiceDisplay = `{${prepared.diceDisplay}}`;
	}

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
	const splitResult = splitDiceComment(processedDice);
	const diceBase = comment !== undefined ? processedDice.trimEnd() : splitResult.dice;
	const resolvedComment = comment ?? splitResult.comment;
	const diceWithoutComment = setSortOrder(diceBase, sort);

	let diceRoll: DiceRoll | DiceRoll[];
	try {
		diceRoll = roller.roll(diceWithoutComment);
	} catch (error) {
		throw new DiceTypeError(diceWithoutComment, "roll", error);
	}

	if (compare && diceRoll) {
		const currentRoll = Array.isArray(diceRoll) ? diceRoll[0] : diceRoll;
		const trivial = isTrivialComparison(
			currentRoll.maxTotal,
			currentRoll.minTotal,
			compare
		);
		compare.trivial = trivial ? true : undefined;
	}

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
				dice: prepared.isSimpleCurly ? finalDiceDisplay : processedDice,
				comment: resolvedComment,
				compare,
				modifier: modificator,
				pityLogs: rerollCount,
				trivial: pityResult.trivial ?? (compare?.trivial ? true : undefined),
			};
		}
	}

	let resultOutput = replaceUnwantedText(roller.output, sort);

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

		if (!resultOutput.length) throw new DiceTypeError(dice, "empty_dice");

		return {
			dice: prepared.isSimpleCurly ? finalDiceDisplay : prepared.diceDisplay,
			result: resultOutput,
			comment: resolvedComment,
			compare: compare ? compare : undefined,
			modifier: modificator,
			total: successes,
			pityLogs: rerollCount > 0 ? rerollCount : undefined,
			trivial: compare?.trivial ? true : undefined,
		};
	}

	return {
		dice: prepared.isSimpleCurly ? finalDiceDisplay : processedDice,
		result: resultOutput,
		comment: resolvedComment,
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
	isSharedCurly?: boolean,
	sort?: SortOrder
): Resultat | undefined {
	// Detect it if the caller didn't already provide it
	if (!explodingSuccessMain)
		explodingSuccessMain = normalizeExplodingSuccess(dice.split(";")[0] ?? dice);

	if (explodingSuccessMain) {
		// Normalize for internal processing; original is kept separately for display
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
	// Comments must be captured and stripped before hidden-dice detection below,
	// so parentheses inside a comment aren't mistaken for a hidden roll
	const commentsRegex = /\[(?<comments>.*?)\]/gi;
	const comments = formatComment(diceMain);
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
		diceMain = diceMainWithoutComments;
	}
	// diceMain's sort order applies to the whole shared roll
	const sortFromMain = getSortOrder(diceMain);
	const rollBounds = getRollBounds(diceMain, engine);
	let diceResult = roll(diceMain, engine, pity, sort);
	if (!diceResult?.total) {
		if (hidden) {
			diceResult = roll(fixParenthesis(split[0]), engine, pity, sort);
			hidden = false;
		} else return undefined;
	}
	if (!diceResult?.total) return undefined;

	// Double-sign exploding: recompute successes from the first segment's output
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
			result: sortSharedResults(results.join(";"), sortFromMain),
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
		const compareRegex = toRoll.match(SIGN_REGEX_SPACE);
		if (compareRegex) {
			if (isSharedCurly) {
				// Curly shared rolls show a success count, not comparison details
				const compareResult = compareSignFormule(
					toRoll,
					compareRegex,
					element,
					diceResult,
					engine,
					pity,
					rollBounds
				);
				const { diceAll } = replaceText(element, diceResult.total, diceResult.dice);
				let successCount = 0;
				try {
					const evaluated = evaluate(toRoll);
					successCount = evaluated ? 1 : 0;
				} catch (error) {
					// Fall back to roll() if evaluate() fails
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
	// Hidden rolls add a dummy first entry; drop it
	if (hidden) results.shift();
	return {
		dice: displayDice,
		result: sortSharedResults(results.join(";"), sortFromMain),
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
