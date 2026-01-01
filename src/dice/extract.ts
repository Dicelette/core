import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import type { Engine } from "random-js";
import type { Modifier, Sign, SortOrder } from "../interfaces";
import { DETECT_CRITICAL } from "../interfaces/constant";
import { replaceFormulaInDice, standardizeDice } from "../utils";
import { calculator } from "./calculator";
import { type ExplodingSuccess, normalizeExplodingSuccess } from "./exploding";

export function getModifier(dice: string) {
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
	//First check if the diceToRoll contains already a sort order
	const sortRegex = /(sa|sd|s)/i;
	if (sort && !toRoll.match(sortRegex)) {
		//we should insert the sort order at the end of the dice string and before the possible modifier or comparison
		const modifierComparisonRegex = /([+\-*/%^]\d+|([><=!]+\d+f)|([><=]|!=)+\d+)$/;
		const match = toRoll.match(modifierComparisonRegex);
		if (match) {
			//Insert before the modifier or comparison
			const index = match.index!;
			toRoll = `${toRoll.slice(0, index)}${sort}${toRoll.slice(index)}`;
		} else {
			//Append at the end
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

/**
 * Prépare la chaîne de dés pour le traitement
 */
export function prepareDice(diceInput: string): PreparedDice {
	let dice = standardizeDice(replaceFormulaInDice(diceInput))
		.replace(/^\+/, "")
		.replaceAll("=>", ">=")
		.replaceAll("=<", "<=")
		.trimStart();

	dice = dice.replaceAll(DETECT_CRITICAL, "").trimEnd();

	const explodingSuccess = normalizeExplodingSuccess(dice);
	if (explodingSuccess) dice = explodingSuccess.dice;

	let diceDisplay: string;
	if (dice.includes(";")) {
		const mainDice = dice.split(";")[0];
		diceDisplay = explodingSuccess?.originalDice ?? mainDice;
	} else {
		diceDisplay = explodingSuccess?.originalDice ?? dice;
	}

	const curlyBulkMatch = dice.match(/^\{(\d+#.*)\}$/);
	const isCurlyBulk = !!curlyBulkMatch;
	const bulkContent = isCurlyBulk ? curlyBulkMatch![1] : "";

	const isSharedRoll = dice.includes(";");
	let isSharedCurly = false;

	if (isSharedRoll && dice.match(/^\{.*;\s*.*\}$/)) {
		dice = dice.slice(1, -1);
		isSharedCurly = true;
		diceDisplay = diceDisplay.slice(1);
	}

	// Handle simple curly braces like {1d20+5} or {1d20+5>10}
	// But NOT dice pool notation like {2d6>4} where the comparison is inside the braces WITHOUT modifiers
	let isSimpleCurly = false;
	if (!isCurlyBulk && !isSharedRoll && dice.match(/^\{.*\}$/)) {
		// Check if this is a dice pool (comparison inside the braces WITHOUT modifiers)
		const innerContent = dice.slice(1, -1); // Remove outer braces
		const hasModifiers = innerContent.match(/[+\-*/%^]/);
		const hasComparison = innerContent.match(/(([><=!]+\d+f)|([><=]|!=)+\d+)/);

		// Only remove braces if it's not a dice pool
		// Dice pool: has comparison inside, NO modifiers (like {2d6>4})
		// Simple curly: has modifiers before comparison (like {1d20+5>10}) or just plain dice (like {1d20+5})
		if (!(hasComparison && !hasModifiers)) {
			dice = innerContent;
			isSimpleCurly = true;
		}
	}

	return {
		dice,
		diceDisplay,
		explodingSuccess,
		isSharedRoll,
		isSharedCurly,
		isCurlyBulk,
		bulkContent,
		isSimpleCurly,
	};
}
