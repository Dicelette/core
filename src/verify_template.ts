/* eslint-disable @typescript-eslint/no-unused-vars */
import { evaluate } from "mathjs";
import { Random } from "random-js";
import "uniformize";

import type { StatisticalTemplate } from ".";
import { createCriticalCustom, roll } from "./dice";
import {
	DiceTypeError,
	EmptyObjectError,
	FormulaError,
	NoStatisticsError,
	TooManyDice,
} from "./errors";
import { templateSchema } from "./interfaces/zod";
import { escapeRegex, replaceFormulaInDice } from "./utils";

/**
 * Verify if the provided dice work with random value
 * @param testDice {string}
 * @param allStats {Record<string,number>}
 */
export function evalStatsDice(testDice: string, allStats?: Record<string, number>) {
	let dice = testDice.trimEnd();
	if (allStats && Object.keys(allStats).length > 0) {
		const names = Object.keys(allStats);
		for (const name of names) {
			const regex = new RegExp(escapeRegex(name.standardize()), "gi");
			if (dice.standardize().match(regex)) {
				const statValue = allStats[name];
				dice = dice.standardize().replace(regex, statValue.toString()).trimEnd();
			}
		}
	}
	try {
		if (!roll(replaceFormulaInDice(dice.replace("{exp}", "1"))))
			throw new DiceTypeError(dice, "evalStatsDice", "no roll result");
		return testDice;
	} catch (error) {
		throw new DiceTypeError(dice, "evalStatsDice", error);
	}
}

/**
 * Generate a random dice and remove the formula (+ evaluate it)
 * Used for diceDamage only
 * @param value {string}
 * @param template {StatisticalTemplate}
 * @returns
 */
export function diceRandomParse(value: string, template: StatisticalTemplate) {
	if (!template.statistics) return replaceFormulaInDice(value.standardize());
	value = value.standardize();
	const statNames = Object.keys(template.statistics);
	let newDice = value;
	for (const name of statNames) {
		const regex = new RegExp(escapeRegex(name.standardize()), "gi");
		if (value.match(regex)) {
			let max: undefined | number = undefined;
			let min: undefined | number = undefined;
			const foundStat = template.statistics?.[name];
			if (foundStat) {
				max = foundStat.max;
				min = foundStat.min;
			}
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min);
			newDice = value.replace(regex, randomStatValue.toString());
		}
	}
	return replaceFormulaInDice(newDice);
}

/**
 * Same as damageDice but for DiceType
 * @param dice {string}
 * @param template {StatisticalTemplate}
 */
export function diceTypeRandomParse(dice: string, template: StatisticalTemplate) {
	if (!template.statistics) return dice;
	const firstStatNotcombinaison = Object.keys(template.statistics).find(
		(stat) => !template.statistics?.[stat].combinaison
	);
	if (!firstStatNotcombinaison) return dice;
	const stats = template.statistics[firstStatNotcombinaison];
	const { min, max } = stats;
	const total = template.total || 100;
	const randomStatValue = generateRandomStat(total, max, min);
	return replaceFormulaInDice(dice.replaceAll("$", randomStatValue.toString()));
}

/**
 * Random the combinaison and evaluate it to check if everything is valid
 * @param combinaison {Record<string,string>}
 * @param stats {Record<string,number|number>}
 */
export function evalCombinaison(
	combinaison: Record<string, string>,
	stats: Record<string, number | string>
) {
	const newStats: Record<string, number> = {};
	for (const [stat, combin] of Object.entries(combinaison)) {
		//replace the stats in formula
		let formula = combin.standardize();
		for (const [statName, value] of Object.entries(stats)) {
			const regex = new RegExp(statName.standardize(), "gi");
			formula = formula.replace(regex, value.toString());
		}
		try {
			newStats[stat] = evaluate(formula);
		} catch (error) {
			throw new FormulaError(stat, "evalCombinaison", error);
		}
	}
	return newStats;
}

/**
 * Evaluate one selected combinaison
 * @param combinaison {string}
 * @param stats {[name: string]: string|number}
 */
export function evalOneCombinaison(
	combinaison: string,
	stats: Record<string, number | string>
) {
	let formula = combinaison.standardize();
	for (const [statName, value] of Object.entries(stats)) {
		const regex = new RegExp(statName.standardize(), "gi");
		formula = formula.replace(regex, value.toString());
	}
	try {
		return evaluate(formula);
	} catch (error) {
		throw new FormulaError(combinaison, "evalOneCombinaison", error);
	}
}

function convertNumber(number: string | number | undefined) {
	if (!number) return undefined;
	const isNumber = (value: unknown): boolean =>
		typeof value === "number" ||
		(!Number.isNaN(Number(value)) && typeof value === "string");
	if (number.toString().length === 0) return undefined;
	if (isNumber(number)) return Number.parseInt(number.toString(), 10);
	return undefined;
}

/**
 * Parse the provided JSON and verify each field to check if everything could work when rolling
 * @param {any} template
 * @returns {StatisticalTemplate}
 */
export function verifyTemplateValue(template: unknown): StatisticalTemplate {
	const parsedTemplate = templateSchema.parse(template);
	const { success, failure } = parsedTemplate.critical ?? {};
	const criticicalVal = {
		success: convertNumber(success),
		failure: convertNumber(failure),
	};
	const statistiqueTemplate: StatisticalTemplate = {
		diceType: parsedTemplate.diceType,
		statistics: parsedTemplate.statistics,
		critical: criticicalVal,
		total: parsedTemplate.total,
		charName: parsedTemplate.charName,
		damage: parsedTemplate.damage,
		customCritical: parsedTemplate.customCritical,
	};
	if (statistiqueTemplate.diceType) {
		const cleanedDice = diceTypeRandomParse(
			statistiqueTemplate.diceType,
			statistiqueTemplate
		);
		const rolled = roll(cleanedDice);
		if (!rolled) {
			throw new DiceTypeError(cleanedDice, "verifyTemplateValue", "no roll result");
		}
	}
	if (statistiqueTemplate.customCritical) {
		if (!statistiqueTemplate.diceType) {
			throw new DiceTypeError("no_dice_type", "verifyTemplateValue", "no dice type");
		}
		const customCritical = statistiqueTemplate.customCritical;
		for (const [, custom] of Object.entries(customCritical)) {
			const cleanedDice = createCriticalCustom(
				statistiqueTemplate.diceType!,
				custom,
				statistiqueTemplate
			);
			const rolled = roll(cleanedDice);
			if (!rolled)
				throw new DiceTypeError(cleanedDice, "verifyTemplateValue", "no roll result");
		}
	}
	testDiceRegistered(statistiqueTemplate);
	testStatCombinaison(statistiqueTemplate);
	return statistiqueTemplate;
}

/**
 * Test each damage roll from the template.damage
 * @param {StatisticalTemplate} template
 */
export function testDiceRegistered(template: StatisticalTemplate) {
	if (!template.damage) return;
	if (Object.keys(template.damage).length === 0) throw new EmptyObjectError();
	if (Object.keys(template.damage).length > 25) throw new TooManyDice();
	for (const [name, dice] of Object.entries(template.damage)) {
		if (!dice) continue;
		const randomDiceParsed = diceRandomParse(dice, template);
		try {
			const rolled = roll(randomDiceParsed);
			if (!rolled) throw new DiceTypeError(name, "no_roll_result", dice);
		} catch (error) {
			console.error(error);
			throw new DiceTypeError(name, "testDiceRegistered", error);
		}
	}
}

/**
 * Test all combinaison with generated random value
 * @param {StatisticalTemplate} template
 */
export function testStatCombinaison(template: StatisticalTemplate) {
	if (!template.statistics) return;
	const onlycombinaisonStats = Object.fromEntries(
		Object.entries(template.statistics).filter(
			([_, value]) => value.combinaison !== undefined
		)
	);
	const allOtherStats = Object.fromEntries(
		Object.entries(template.statistics).filter(([_, value]) => !value.combinaison)
	);
	if (Object.keys(onlycombinaisonStats).length === 0) return;
	const allStats = Object.keys(template.statistics).filter(
		(stat) => !template.statistics![stat].combinaison
	);
	if (allStats.length === 0) throw new NoStatisticsError();
	const error = [];
	for (const [stat, value] of Object.entries(onlycombinaisonStats)) {
		let formula = value.combinaison as string;
		for (const [other, data] of Object.entries(allOtherStats)) {
			const { max, min } = data;
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min);
			const regex = new RegExp(other, "gi");
			formula = formula.replace(regex, randomStatValue.toString());
		}
		try {
			evaluate(formula);
		} catch (e) {
			error.push(stat);
		}
	}
	if (error.length > 0) throw new FormulaError(error.join(", "), "testStatCombinaison");
	return;
}

/**
 * Generate a random stat based on the template and the statistical min and max
 * @param {number|undefined} total
 * @param {number | undefined} max
 * @param {number | undefined} min
 * @returns
 */
export function generateRandomStat(
	total: number | undefined = 100,
	max?: number,
	min?: number
) {
	let randomStatValue = total + 1;
	while (randomStatValue >= total || randomStatValue === 0) {
		const random = new Random();
		if (max && min) randomStatValue = random.integer(min, max);
		else if (max) randomStatValue = random.integer(1, max);
		else if (min) randomStatValue = random.integer(min, total);
		else randomStatValue = random.integer(1, total);
	}
	return randomStatValue;
}
