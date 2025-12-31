import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import type { Engine } from "random-js";
import type { Modifier, Sign } from "../interfaces";
import { calculator } from "./calculator";

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
