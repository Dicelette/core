import { type DiceRoll, DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { evaluate } from "mathjs";
import type { Engine } from "random-js";
import {
	COMMENT_REGEX,
	type Compare,
	type ComparedValue,
	countExplodingSuccesses,
	DETECT_CRITICAL,
	DiceTypeError,
	EXPLODING_SUCCESS_REGEX,
	type ExplodingSuccess,
	isNumber,
	normalizeExplodingSuccess,
	OPTIONAL_COMMENT,
	type Resultat,
	replaceFormulaInDice,
	SIGN_REGEX,
	SIGN_REGEX_SPACE,
	SortOrder,
	SYMBOL_DICE,
	standardizeDice,
} from ".";
import {
	canComparisonSucceed,
	compareSignFormule,
	extractValuesFromOutput,
	fixParenthesis,
	formatComment,
	getCompare,
	getModifier,
	getRollBounds,
	inverseSign,
	isTrivialComparison,
	matchComparison,
	replaceText,
	replaceUnwantedText,
} from "./dice";

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
	//parse dice string
	dice = standardizeDice(replaceFormulaInDice(dice))
		.replace(/^\+/, "")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimStart();
	if (!dice.includes("d")) return undefined;
	dice = dice.replaceAll(DETECT_CRITICAL, "").trimEnd();

	const explodingSuccess = normalizeExplodingSuccess(dice);
	if (explodingSuccess) dice = explodingSuccess.dice;

	// For shared rolls, extract the main dice part before the semicolon for diceDisplay
	let diceDisplay: string;
	if (dice.includes(";")) {
		const mainDice = dice.split(";")[0];
		diceDisplay = explodingSuccess?.originalDice ?? mainDice;
	} else diceDisplay = explodingSuccess?.originalDice ?? dice;

	// Detect curly braces with bulk rolls (e.g., {5#1d20>5})
	// For these, we keep the curly braces in the dice notation and don't extract compare
	const curlyBulkMatch = dice.match(/^\{(\d+#.*)\}$/);
	const isCurlyBulk = !!curlyBulkMatch;
	let bulkContent = "";
	if (isCurlyBulk) bulkContent = curlyBulkMatch![1]; // Store content without curly braces for processing

	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	let compare: ComparedValue | undefined;
	if (dice.includes(";"))
		return sharedRolls(dice, engine, pity, explodingSuccess, diceDisplay);

	dice = fixParenthesis(dice);
	const modificator = getModifier(dice);

	// Extract compare BEFORE rolling, but NOT for curly bulk rolls
	if (compareRegex && !isCurlyBulk) {
		const compareResult = getCompare(dice, compareRegex, engine, pity);
		dice = compareResult.dice;
		compare = compareResult.compare;
	}

	// Handle bulk rolls (both with and without curly braces)
	const bulkProcessContent = isCurlyBulk ? bulkContent : dice;
	if (bulkProcessContent.match(/\d+?#(.*)/)) {
		const diceArray = bulkProcessContent.split("#");
		const numberOfDice = Number.parseInt(diceArray[0], 10);
		let diceToRoll = diceArray[1].replace(COMMENT_REGEX, "");
		const commentsMatch = diceArray[1].match(COMMENT_REGEX);
		const comments = commentsMatch ? commentsMatch[2] : undefined;

		// For curly bulk, extract comparison from diceToRoll
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

		if (sort) diceToRoll = `${diceToRoll}${sort}`;

		// When there's a comparison, handle each roll individually
		const activeCompare: Compare | undefined =
			compare ||
			curlyCompare ||
			(explodingSuccess
				? ({ sign: explodingSuccess.sign, value: explodingSuccess.value } as Compare)
				: undefined);
		let trivialComparisonDetected = false;
		if (activeCompare) {
			const results: string[] = [];
			let successCount = 0;
			const roller = new DiceRoller();
			NumberGenerator.generator.engine = engine;

			// Helper to format output with comparison notation for curly bulk
			const formatOutput = (output: string, addStar: boolean) => {
				// Only add * for curly bulk rolls
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
							.replace(
								explodingSuccess.normalizedSegment,
								explodingSuccess.originalSegment
							)
							.replace(/=\s*-?\d+(?:\.\d+)?$/, `= ${successesForRoll}`);
						// For exploding success counting, keep output consistent across bulk and curly bulk
						// and avoid adding stars (which are only meant for classic comparison highlighting).
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

			const signSource = explodingSuccess?.originalDice ?? diceDisplay ?? dice;
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
					">>=": ">=",
					"<<=": "<=",
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

			if (compare && trivialComparisonDetected) compare.trivial = true;

			const finalDice = isCurlyBulk
				? `{${diceToRoll}${curlyCompare?.sign}${curlyCompare?.value}}`
				: diceToRoll;

			const resultOutput = replaceUnwantedText(results.join("; "));
			const finalTotal = explodingSuccess
				? resultOutput
						.split(";")
						.flatMap((segment) => extractValuesFromOutput(segment))
						.filter((val) =>
							matchComparison(explodingSuccess.sign, val, explodingSuccess.value)
						).length
				: successCount;

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

		// Original behavior when there's no comparison
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

		// For curly bulk without comparison, keep curly braces in dice
		const finalDice = isCurlyBulk ? `{${diceToRoll}}` : diceToRoll;

		return {
			dice: finalDice,
			result: replaceUnwantedText(roller.output),
			comment: comments,
			compare: compare ? compare : undefined,
			modifier: modificator,
			total: roller.total,
		};
	}
	const roller = new DiceRoller();
	NumberGenerator.generator.engine = engine;
	let diceWithoutComment = dice.replace(COMMENT_REGEX, "").trimEnd();
	if (sort) diceWithoutComment = `${diceWithoutComment}${sort}`;

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
						trivial: res.trivial ?? (compare?.trivial ? true : undefined),
					};
				}
			}
		} else console.log("Comparison impossible, pity ignored");
	}
	let resultOutput = replaceUnwantedText(roller.output);

	if (explodingSuccess) {
		const successes = countExplodingSuccesses(
			diceRoll,
			explodingSuccess.sign,
			explodingSuccess.value
		);
		resultOutput = resultOutput
			.replace(/=\s*-?\d+(?:\.\d+)?$/, `= ${successes}`)
			.replace(explodingSuccess.normalizedSegment, explodingSuccess.originalSegment);

		return {
			dice: diceDisplay,
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
		dice,
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
	diceDisplay?: string
): Resultat | undefined {
	// If not provided (call from elsewhere), try to detect
	if (!explodingSuccessMain) {
		explodingSuccessMain = normalizeExplodingSuccess(dice.split(";")[0] ?? dice);
	}
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

export function rollCompare(
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
