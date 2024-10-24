// FILEPATH: /c:/Users/simonettili/Documents/Github/discord-dicelette/src/utils/verify_template.test.ts
import * as core from "../src";
import { describe, expect, it } from "vitest";

	describe("evalCombinaison", () => {
		it("should evaluate the combination correctly", () => {
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

	describe("verifyRandomGenerator", () => {
		// Add more tests for different scenarios
		it("should verify the random generator correctly", () => {
			const total = 100;
			const max = 50;
			const min = 10;
			const result = core.generateRandomStat(total, max, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(max);
			expect(result).toBeLessThanOrEqual(total);
		});

		it("should verify with no max", () => {
			const total = 100;
			const min = 1;
			const result = core.generateRandomStat(total, undefined, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(total);
		});

		it("should verify with no min", () => {
			const total = 100;
			const max = 99;
			const result = core.generateRandomStat(total, max, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(max);
		});

		it("should verify with no min and max", () => {
			const total = 100;
			const result = core.generateRandomStat(total, undefined, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(total);
		});

		it("should verify with no total", () => {
			const max = 99;
			const min = 1;
			const result = core.generateRandomStat(undefined, max, min);
			expect(result).toBeGreaterThanOrEqual(min);
			expect(result).toBeLessThanOrEqual(max);
		});

		it("should verify with no total, min and max", () => {
			const result = core.generateRandomStat(undefined, undefined, undefined);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(100);
		});
	});

	describe("verifyTemplateValue", () => {
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
			expect(result).toEqual(template);
		});

		it("testing no statistic, only damage", () => {
			const template = {
				diceType: "d6",
				damage: {
					piercing: "1d6+2>20",
				},
			};
			const result = core.verifyTemplateValue(template);
			expect(result).toEqual(template);
		});
		
		it("testing with formula dices", ()=>{
			const template = {
				diceType: "1d20",
				damage: {
					regeneration: "1d6;round(µ/2)",
				}
			}
			const result = core.verifyTemplateValue(template);
			expect(result).toEqual(template);
		})

		it("should throw an error for invalid dice type", () => {
			const template = {
				statistics: { stat1: { max: 10, min: 1, combinaison: "stat2 + 3" } },
				diceType: "invalid",
			};
			expect(() => core.verifyTemplateValue(template)).toThrow();
		});
	});

	describe("combinaison", () => {
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
	describe("roll_string_creation", () => {
		it("creating roll dice with formula", () => {
			const dice = "1d20+$>20";
			const userStat = 10;
			const calculation = core.replaceFormulaInDice(
				dice.replaceAll("$", userStat.toString())
			);
			const formula = `${calculation} coucou`;
			const expectedFormula = "1d20+10>20 coucou";
			expect(formula).toEqual(expectedFormula);
		});
		it("creating roll dice with success formula", () => {
			const dice = "1d20+5>{{$*2}}";
			const userStat = 10;
			const calculation = core.replaceFormulaInDice(
				dice.replaceAll("$", userStat.toString())
			);
			const formula = `${calculation} coucou`;
			const expectedFormula = "1d20+5>20 coucou";
			expect(formula).toEqual(expectedFormula);
		});
		it("creating roll dice with complicated formula", () => {
			const dice = "1d20+{{ceil((10-$)/2)}}>20";
			const userStat = 5;
			const calculation = core.replaceFormulaInDice(
				dice.replaceAll("$", userStat.toString())
			);
			const formula = `${calculation} coucou`;
			const expectedFormula = "1d20+3>20 coucou";
			expect(formula).toEqual(expectedFormula);
		});
		it("creating roll dice with negative formula", () => {
			const dice = "1d20+{{ceil(($-10)/2)}}>20";
			const userStat = 5;
			const calculation = core.replaceFormulaInDice(
				dice.replaceAll("$", userStat.toString())
			);
			const expectedFormula = "1d20-2>20";
			expect(calculation).toEqual(expectedFormula);
		});
	});
	describe("skill_dice_creation", () => {
		it("creating roll dice with face formula", () => {
			let dice = "1dstat1>20";
			const userStat = {
				stat1: 5,
				stat2: 10,
			};
			dice = core.generateStatsDice(dice, userStat);
			const formula = `${dice} cc`;
			const expectedFormula = "1d5>20 cc";
			expect(formula).toEqual(expectedFormula);
		});
		it("creating complicated roll dice with face formula", () => {
			let dice = "1d20+{{ceil((stat1-10)/2)}}>20";
			const userStat = {
				stat1: 10,
				stat2: 10,
			};
			dice = core.generateStatsDice(dice, userStat);
			const formula = `${dice} cc`;
			const expectedFormula = "1d20+0>20 cc";
			expect(formula).toEqual(expectedFormula);
		});
		it("create a simple dice adding bonus superior to stats", () => {
			let dice = "1d20+stat1>stat1";
			const userStat = {
				stat1: 5,
				stat2: 10,
			};
			dice = core.generateStatsDice(dice, userStat);
			const formula = `${dice} cc`;
			const expectedFormula = "1d20+5>5 cc";
			expect(formula).toEqual(expectedFormula);
		});
		it("creating complicated roll dice with comparator as formula", () => {
			let dice = "1d20+stat1>{{ceil(stat1/2)}}";
			const userStat = {
				stat1: 5,
				stat2: 10,
			};
			dice = core.generateStatsDice(dice, userStat);
			const formula = `${dice} cc`;
			const expectedFormula = "1d20+5>3 cc";
			expect(formula).toEqual(expectedFormula);
		});
	});
	describe("template form stupid", () => {
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
	});
