import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("evaluate combinaison", () => {
	it("should evaluate the combinaison correctly", () => {
		const combinaison = { stat1: "stat2 + 3" };
		const stats = { stat2: 2 };
		const result = core.evalCombinaison(combinaison, stats);
		expect(result).toEqual({ stat1: 5 });
	});

	it("should throw an error for invalid formula", () => {
		const combinaison = { stat1: "stat2 + " };
		const stats = { stat2: 2 };
		expect(() => core.evalCombinaison(combinaison, stats)).toThrow();
	});
});
describe("test stat combinaison", () => {
	// Add more tests for different scenarios
	it("should throw an error because they are no stat2", () => {
		const template: core.StatisticalTemplate = {
			statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
			diceType: "d6",
		};
		expect(() => core.testStatCombinaison(template)).toThrow();
	});
	it("validate formula for dice", () => {
		const template: core.StatisticalTemplate = {
			statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
			diceType: "d6+{{$}}>20",
		};
		expect(() => core.testStatCombinaison(template)).toThrow();
	});
	it("validate formula for dice", () => {
		const template: core.StatisticalTemplate = {
			statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
			diceType: "d6+5>{{$}}",
		};
		expect(() => core.testStatCombinaison(template)).toThrow();
	});
});
describe("random parse", () => {
	it("create combinaison dice formula for skill dice with statistic", () => {
		const testTemplate: core.StatisticalTemplate = {
			statistics: { stat1: { max: 10, min: 1 } },
			diceType: "1d20",
			damage: {
				piercing: "1d6 + stat1>stat1",
			},
		};
		const expectedFormula = core.diceRandomParse(
			"1d20 + {{ceil((stat1-10)/2)}}>stat1",
			testTemplate
		);
		expect(expectedFormula).toEqual(expectedFormula);
	});
});
describe("test dice registered", () => {
	it("Test a roll with a combinaison on the dice", () => {
		const template: core.StatisticalTemplate = {
			statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
			diceType: "1d20",
			damage: {
				piercing: "1d20stat1*2>stat1",
			},
		};
		expect(() => core.testDiceRegistered(template)).not.toThrow();
	});
	it("Test a roll with a combinaison on the dice and accents", () => {
		// noinspection NonAsciiCharacters,SpellCheckingInspection
		const template: core.StatisticalTemplate = {
			statistics: { éducation: { max: 10, min: 1 } },
			diceType: "1d20",
			damage: {
				piercing: "1déducation>20",
			},
		};
		expect(() => core.testDiceRegistered(template)).not.toThrow();
	});
});
