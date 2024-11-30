/* eslint-disable @typescript-eslint/no-unused-vars */
import { evaluate } from "mathjs";
import { Random } from "random-js";
import "uniformize";

import type { Statistic, StatisticalTemplate } from ".";
import { roll } from "./dice";
import {
	DiceTypeError,
	EmptyObjectError,
	FormulaError,
	MaxGreater,
	NoStatisticsError,
	TooManyDice,
	TooManyStats,
} from "./errors";
import { escapeRegex, replaceFormulaInDice } from "./utils";

/**
 * Verify if the provided dice work with random value
 * @param testDice {string}
 * @param allStats {[name: string]: number}
 */
export function evalStatsDice(testDice: string, allStats?: { [name: string]: number }) {
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
		if (!roll(replaceFormulaInDice(dice)))
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
	if (!template.statistics) return value;
	//biome-ignore lint/style/noParameterAssign: I need to assign the value to the variable
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
	return replaceFormulaInDice(dice.replace("$", randomStatValue.toString()));
}

/**
 * Random the combinaison and evaluate it to check if everything is valid
 * @param combinaison {[name: string]: string}
 * @param stats {[name: string]: string|number}
 */
export function evalCombinaison(
	combinaison: { [name: string]: string },
	stats: { [name: string]: string | number }
) {
	const newStats: { [name: string]: number } = {};
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
	stats: { [name: string]: string | number }
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

/**
 * Parse the provided JSON and verify each field to check if everything could work when rolling
 * @param {any} template
 * @returns {StatisticalTemplate}
 */
//biome-ignore lint/suspicious/noExplicitAny: I need to use any to allow any type
export function verifyTemplateValue(template: any): StatisticalTemplate {
	const statistiqueTemplate: StatisticalTemplate = {
		diceType: "",
		statistics: {} as Statistic,
	};
	if (!template.statistics) statistiqueTemplate.statistics = undefined;
	else if (template.statistics && Object.keys(template.statistics).length > 0) {
		if (Object.keys(template.statistics).length > 25) throw new TooManyStats();
		for (const [key, value] of Object.entries(template.statistics)) {
			const dataValue = value as { max?: number; min?: number; combinaison?: string };
			if (dataValue.max && dataValue.min && dataValue.max <= dataValue.min)
				throw new MaxGreater(dataValue.min, dataValue.max);
			if (dataValue.max && dataValue.max <= 0) dataValue.max = undefined;
			if (dataValue.min && dataValue.min <= 0) dataValue.min = undefined;
			let formula = dataValue.combinaison
				? dataValue.combinaison.standardize()
				: undefined;
			formula = formula && formula.trim().length > 0 ? formula : undefined;
			if (!statistiqueTemplate.statistics) {
				statistiqueTemplate.statistics = {} as Statistic;
			}
			statistiqueTemplate.statistics[key] = {
				max: dataValue.max,
				min: dataValue.min,
				combinaison: formula || undefined,
			};
		}
	}
	if (template.diceType) {
		statistiqueTemplate.diceType = template.diceType;
		const cleanedDice = diceTypeRandomParse(template.diceType, statistiqueTemplate);
		const rolled = roll(cleanedDice);
		if (!rolled)
			throw new DiceTypeError(cleanedDice, "verifyTemplateValue", "no roll result");
	}

	if (template.critical && Object.keys(template.critical).length > 0) {
		statistiqueTemplate.critical = {
			failure: template.critical.failure ?? undefined,
			success: template.critical.success ?? undefined,
		};
	}
	if (template.total) {
		if (template.total <= 0) template.total = undefined;
		statistiqueTemplate.total = template.total;
	}
	if (template.charName) statistiqueTemplate.charName = template.charName;
	if (template.damage) statistiqueTemplate.damage = template.damage;
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
			if (!rolled) throw new DiceTypeError(name, "testDiceRegistered", "no roll result");
		} catch (error) {
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
	while (randomStatValue >= total && randomStatValue <= 0) {
		const random = new Random();
		if (max && min) randomStatValue = random.integer(min, max);
		else if (max) randomStatValue = random.integer(1, max);
		else if (min) randomStatValue = random.integer(min, total);
		else randomStatValue = random.integer(1, total);
	}
	return randomStatValue;
}
