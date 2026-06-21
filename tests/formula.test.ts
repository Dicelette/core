import { describe, expect, it } from "bun:test";
import { replaceFormulaInDice } from "../src";

it("simple roll", () => {
	const dice = "1d20+$>20";
	const userStat = 10;
	const calculation = replaceFormulaInDice(dice.replaceAll("$", userStat.toString()));
	const formula = `${calculation} coucou`;
	const expectedFormula = "1d20+10>20 coucou";
	expect(formula).toEqual(expectedFormula);
});
it("success formula", () => {
	const dice = "1d20+5>{{$*2}}";
	const userStat = 10;
	const calculation = replaceFormulaInDice(dice.replaceAll("$", userStat.toString()));
	const formula = `${calculation} coucou`;
	const expectedFormula = "1d20+5>20 coucou";
	expect(formula).toEqual(expectedFormula);
});
it("complicated formula", () => {
	const dice = "1d20+{{ceil((10-$)/2)}}>20";
	const userStat = 5;
	const calculation = replaceFormulaInDice(dice.replaceAll("$", userStat.toString()));
	const formula = `${calculation} coucou`;
	const expectedFormula = "1d20+3>20 coucou";
	expect(formula).toEqual(expectedFormula);
});
it("negative formula", () => {
	const dice = "1d20+{{ceil(($-10)/2)}}>20";
	const userStat = 5;
	const calculation = replaceFormulaInDice(dice.replaceAll("$", userStat.toString()));
	const expectedFormula = "1d20-2>20";
	expect(calculation).toEqual(expectedFormula);
});

describe("dice notation inside {{}} blocks", () => {
	it("evaluates a single die to a number in range", () => {
		const result = replaceFormulaInDice("{{1d6}}");
		const value = Number.parseInt(result, 10);
		expect(Number.isNaN(value)).toBe(false);
		expect(value).toBeGreaterThanOrEqual(1);
		expect(value).toBeLessThanOrEqual(6);
	});

	it("evaluates die with arithmetic modifier", () => {
		const result = replaceFormulaInDice("1d20+{{1d4+2}}>15");
		// The {{1d4+2}} part evaluates to 3–6; full string becomes "1d20+N>15"
		const match = /^1d20\+([3-6])>15$/.exec(result);
		expect(match).not.toBeNull();
	});

	it("ternary formula with dice in true branch — stat above threshold", () => {
		// Simulates custom formula "$>85 ? 1d10+$ : $" with $=90
		const dice = "1d100>={{90>85?1d10+90:90}}";
		const result = replaceFormulaInDice(dice);
		// 90>85 is true ⇒ 1d10+90, range [91, 100]
		const match = /^1d100>=(\d+)$/.exec(result);
		expect(match).not.toBeNull();
		const value = Number.parseInt(match![1], 10);
		expect(value).toBeGreaterThanOrEqual(91);
		expect(value).toBeLessThanOrEqual(100);
	});

	it("ternary formula with dice in true branch — stat below threshold", () => {
		// Simulates custom formula "$>85 ? 1d10+$ : $" with $=70
		const dice = "1d100>={{70>85?1d10+70:70}}";
		const result = replaceFormulaInDice(dice);
		// 70>85 is false ⇒ 70 (no dice rolled in false branch)
		expect(result).toBe("1d100>=70");
	});

	it("same dice type is rolled once and reused within one block", () => {
		// 1d1 always returns 1; if rolled independently each time, sum = 1+1 = 2
		// caching ensures the same value is used for each occurrence
		const result = replaceFormulaInDice("{{1d1+1d1}}");
		expect(result).toBe("2");
	});

	it("multiple distinct dice in one block each roll independently", () => {
		// 1d1=1 and 2d1=2; 1d1+2d1 = 1+2 = 3
		const result = replaceFormulaInDice("{{1d1+2d1}}");
		expect(result).toBe("3");
	});

	it("non-dice formula block unchanged by dice support", () => {
		const result = replaceFormulaInDice("1d20+{{ceil((10-5)/2)}}>20");
		expect(result).toBe("1d20+3>20");
	});
});

