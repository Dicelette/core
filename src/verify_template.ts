import { evaluate } from "mathjs";
import { type Engine, Random } from "random-js";
import "uniformize";

import { NumberGenerator } from "@dice-roller/rpg-dice-roller";
import {
	createCriticalCustom,
	DETECT_CRITICAL,
	DiceTypeError,
	EmptyObjectError,
	escapeRegex,
	FormulaError,
	NoStatisticsError,
	replaceExpByRandom,
	replaceFormulaInDice,
	roll,
	type StatisticalTemplate,
	TooManyDice,
	templateSchema,
} from ".";
import { isNumber, randomInt } from "./utils";

/**
 * Verify if the provided dice work with random value
 * @param testDice {string}
 * @param allStats {Record<string,number>}
 * @param engine
 * @param pity
 */
export function evalStatsDice(
	testDice: string,
	allStats?: Record<string, number>,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto,
	pity?: boolean
) {
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
		if (!roll(replaceFormulaInDice(replaceExpByRandom(dice)), engine, pity))
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
 * @param engine
 * @returns
 */
export function diceRandomParse(
	value: string,
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	if (!template.statistics) return replaceFormulaInDice(value.standardize());
	value = value.standardize();
	const statNames = Object.keys(template.statistics);
	let newDice = value;
	for (const name of statNames) {
		const regex = new RegExp(escapeRegex(name.standardize()), "gi");
		if (value.match(regex)) {
			let max: undefined | number;
			let min: undefined | number;
			const foundStat = template.statistics?.[name];
			if (foundStat) {
				max = foundStat.max;
				min = foundStat.min;
			}
			const total = template.total || 100;
			const randomStatValue = generateRandomStat(total, max, min, engine);
			newDice = value.replace(regex, randomStatValue.toString());
		}
	}
	return replaceFormulaInDice(newDice);
}

/**
 * Same as damageDice but for DiceType
 * @param dice {string}
 * @param template {StatisticalTemplate}
 * @param engine
 */
export function diceTypeRandomParse(
	dice: string,
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	dice = replaceExpByRandom(dice);
	if (!template.statistics) return dice;
	const firstStatNotcombinaison = Object.keys(template.statistics).find(
		(stat) => !template.statistics?.[stat].combinaison
	);
	if (!firstStatNotcombinaison) return dice;
	const stats = template.statistics[firstStatNotcombinaison];
	const { min, max } = stats;
	const total = template.total || 100;
	const randomStatValue = generateRandomStat(total, max, min, engine);
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
	if (number === undefined || number === null) return undefined;
	if (
		number.toString().length === 0 ||
		Number.isNaN(Number.parseInt(number.toString(), 10))
	)
		return undefined;
	if (isNumber(number)) return Number.parseInt(number.toString(), 10);
	return undefined;
}

/**
 * Parse the provided JSON and verify each field to check if everything could work when rolling
 * @param {unknown} template
 * @param {boolean} verify - If true, will roll the dices to check if everything is valid
 * @param engine
 * @returns {StatisticalTemplate}
 */
export function verifyTemplateValue(
	template: unknown,
	verify = true,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
): StatisticalTemplate {
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
		forceDistrib: parsedTemplate.forceDistrib,
	};
	if (!verify) return statistiqueTemplate;
	if (statistiqueTemplate.diceType) {
		if (statistiqueTemplate.diceType.match(DETECT_CRITICAL)) {
			throw new DiceTypeError(
				statistiqueTemplate.diceType,
				"critical_dice_type",
				"contains critical detection: should be in custom critical instead"
			);
		}
		const cleanedDice = diceTypeRandomParse(
			statistiqueTemplate.diceType,
			statistiqueTemplate,
			engine
		);
		const rolled = roll(cleanedDice, engine);
		if (!rolled) throw new DiceTypeError(cleanedDice, "no_roll_result", "no roll result");
	}
	if (statistiqueTemplate.customCritical) {
		if (!statistiqueTemplate.diceType) {
			throw new DiceTypeError("no_dice_type", "no_dice_type", "no dice type");
		}
		const customCritical = statistiqueTemplate.customCritical;
		for (const [, custom] of Object.entries(customCritical)) {
			const cleanedDice = createCriticalCustom(
				statistiqueTemplate.diceType!,
				custom,
				statistiqueTemplate,
				engine
			);
			const rolled = roll(cleanedDice, engine);
			if (!rolled)
				throw new DiceTypeError(cleanedDice, "verifyTemplateValue", "no roll result");
		}
	}
	testDiceRegistered(statistiqueTemplate, engine);
	testStatCombinaison(statistiqueTemplate, engine);
	return statistiqueTemplate;
}

/**
 * Test each damage roll from the template.damage
 * @param {StatisticalTemplate} template
 * @param engine
 */
export function testDiceRegistered(
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	if (!template.damage) return;
	if (Object.keys(template.damage).length === 0) throw new EmptyObjectError();
	if (Object.keys(template.damage).length > 25) throw new TooManyDice();
	for (const [name, dice] of Object.entries(template.damage)) {
		if (!dice) continue;
		const diceReplaced = replaceExpByRandom(dice);
		const randomDiceParsed = diceRandomParse(diceReplaced, template, engine);
		try {
			const rolled = roll(randomDiceParsed, engine);
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
 * @param engine
 */
export function testStatCombinaison(
	template: StatisticalTemplate,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
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
			const randomStatValue = generateRandomStat(total, max, min, engine);
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
 * @param engine
 * @returns
 */
export function generateRandomStat(
	total: number | undefined = 100,
	max?: number,
	min?: number,
	engine: Engine | null = NumberGenerator.engines.nodeCrypto
) {
	let randomStatValue = total + 1;
	const random = new Random(engine || NumberGenerator.engines.nodeCrypto);
	while (randomStatValue >= total || randomStatValue === 0) {
		if (max && min) randomStatValue = randomInt(min, max, engine, random);
		else if (max) randomStatValue = randomInt(1, max, engine, random);
		else if (min) randomStatValue = randomInt(min, total, engine, random);
		else randomStatValue = randomInt(1, total, engine, random);
	}
	return randomStatValue;
}
