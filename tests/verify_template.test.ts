import { expect, it } from "bun:test";
import * as core from "../src";
import type { StatisticalTemplate } from "../src";

// Add more tests for different scenarios
it("should verify the template correctly", () => {
	const template = {
		statistics: { stat1: { max: 10, min: 1 } },
		diceType: "1d20+{{ceil(($-10)/2)}}>20",
		damage: {
			piercing: "1d6+2",
		},
	};
	const result = core.verifyTemplateValue(template);
	expect(result).toMatchObject(template);
});

it("template validated with customCritical value", () => {
	const template: StatisticalTemplate = {
		statistics: { stat1: { max: 10, min: 1 } },
		diceType: "1d20+{{ceil(($-10)/2)}}>20",
		damage: {
			piercing: "1d6+2",
		},
		customCritical: {
			hardSuccess: {
				sign: ">",
				value: "{{round($/5)}}",
			},
			hardFailure: {
				sign: "<",
				value: "{{round($/5)}}",
			},
		},
	};
	const result = core.verifyTemplateValue(template);
	expect(result).toMatchObject(template);
});

it("testing no statistic, only damage", () => {
	const template: StatisticalTemplate = {
		diceType: "d6",
		damage: {
			piercing: "1d6+2>20",
		},
	};
	const result = core.verifyTemplateValue(template);
	expect(result).toMatchObject(template);
});

it("testing with formula dices", () => {
	const template: StatisticalTemplate = {
		diceType: "1d20",
		damage: {
			regeneration: "1d6;round(&/2)",
		},
	};
	const result = core.verifyTemplateValue(template);
	expect(result).toMatchObject(template);
});

it("should throw an error for invalid dice type", () => {
	const template = {
		statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
		diceType: "invalid",
	};
	expect(() => core.verifyTemplateValue(template)).toThrow();
});

it("should throw an error for invalid dice type", () => {
	const template = {
		diceType: "invalid",
		critical: {
			failure: 1,
			success: 20,
		},
	};
	expect(() => core.verifyTemplateValue(template)).toThrow();
});
