import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import type { Engine } from "random-js";
import { type Modifier, REMOVER_PATTERN, type Sign, SortOrder } from "../interfaces";
import { replaceFormulaInDice } from "../similarities";
import { standardizeDice } from "../utils";
import { calculator } from "./calculator";
import { type ExplodingSuccess, normalizeExplodingSuccess } from "./exploding";

export function getModifier(dice: string) {
	const modifier = dice.matchAll(/(\+|-|%|\/|\^|\*|\*{2})(\d+)/gi);
	let modificator: Modifier | undefined;
	for (const mod of modifier) {
		// Combine with the previous modifier if there are several
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

export function extractValuesFromOutput(output: string): number[] {
	const values: number[] = [];
	const regex = /\[([^\]]+)\]/g;
	let match: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: best method to extract all matches
	while ((match = regex.exec(output)) !== null) {
		const segmentValues = match[1]
			.split(",")
			.map((v) => Number.parseInt(v.replace(/[!*]/g, "").trim(), 10))
			.filter((v) => !Number.isNaN(v));
		values.push(...segmentValues);
	}
	return values;
}

export function getRollBounds(
	dice: string,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): { min: number; max: number } | undefined {
	try {
		const roller = new DiceRoller();
		NumberGenerator.generator.engine = engine;
		const rollResult = roller.roll(dice);
		const instance = Array.isArray(rollResult) ? rollResult[0] : rollResult;
		const { minTotal, maxTotal } = instance;
		return { min: minTotal, max: maxTotal };
	} catch (error) {
		// Ignore bounds computation errors; trivial detection will simply be skipped
	}
	return undefined;
}

export function setSortOrder(toRoll: string, sort?: SortOrder): string {
	const sortRegex = /(sa|sd|s)/i;
	if (sort && !toRoll.match(sortRegex)) {
		// Insert before any trailing modifier/comparison, else append at the end
		const modifierComparisonRegex = /([+\-*/%^]\d+|([><=!]+\d+f)|([><=]|!=)+\d+)$/;
		const match = toRoll.match(modifierComparisonRegex);
		if (match) {
			const index = match.index!;
			toRoll = `${toRoll.slice(0, index)}${sort}${toRoll.slice(index)}`;
		} else {
			toRoll += sort;
		}
	}
	return toRoll;
}

interface PreparedDice {
	dice: string;
	diceDisplay: string;
	explodingSuccess?: ExplodingSuccess;
	isSharedRoll: boolean;
	isSharedCurly: boolean;
	isCurlyBulk: boolean;
	bulkContent: string;
	isSimpleCurly: boolean;
}

/** Normalizes a raw dice string and detects its shape (shared, bulk, curly, exploding). */
export function prepareDice(diceInput: string): PreparedDice {
	let dice = standardizeDice(replaceFormulaInDice(diceInput))
		.replace(/^\+/, "")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimStart();

	dice = dice.replaceAll(REMOVER_PATTERN.CRITICAL_BLOCK, "").trimEnd();

	const explodingSuccess = normalizeExplodingSuccess(dice);
	if (explodingSuccess) dice = explodingSuccess.dice;

	const sharedSeparatorIndex = dice.indexOf(";");
	const hasSharedSeparator = sharedSeparatorIndex !== -1;
	let diceDisplay =
		explodingSuccess?.originalDice ??
		(hasSharedSeparator ? dice.slice(0, sharedSeparatorIndex) : dice);

	const curlyBulkMatch = dice.match(/^\{(\d+#.*)\}$/);
	const isCurlyBulk = !!curlyBulkMatch;
	const bulkContent = isCurlyBulk ? curlyBulkMatch![1] : "";

	let isSharedCurly = false;

	if (hasSharedSeparator && dice.match(/^\{.*;\s*.*\}$/)) {
		dice = dice.slice(1, -1);
		isSharedCurly = true;
		diceDisplay = diceDisplay.slice(1);
	}

	// Simple curly braces (e.g. {1d20+5>10}) get unwrapped; dice pool notation (e.g. {2d6>4},
	// a comparison with no modifiers) stays wrapped for target-success counting instead.
	let isSimpleCurly = false;
	if (!isCurlyBulk && !hasSharedSeparator && dice.match(/^\{.*\}$/)) {
		const innerContent = dice.slice(1, -1);
		const hasModifiers = innerContent.match(/[+\-*/%^]/);
		const hasComparison = innerContent.match(/(([><=!]+\d+f)|([><=]|!=)+\d+)/);
		if (!(hasComparison && !hasModifiers)) {
			dice = innerContent;
			isSimpleCurly = true;
		}
	}

	return {
		dice,
		diceDisplay,
		explodingSuccess,
		isSharedRoll: hasSharedSeparator,
		isSharedCurly,
		isCurlyBulk,
		bulkContent,
		isSimpleCurly,
	};
}

export function getSortOrder(dice: string): SortOrder | undefined {
	if (dice.startsWith("sa") || dice.endsWith("sa")) return SortOrder.Ascending;
	if (dice.startsWith("sd") || dice.endsWith("sd")) return SortOrder.Descending;
	return undefined;
}
