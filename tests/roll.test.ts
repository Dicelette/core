import { describe, expect, it } from "bun:test";
import * as core from "../src";

it("should roll the dice correctly", () => {
	const result = core.roll("2d6");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(2);
	expect(result!.total).toBeLessThanOrEqual(12);
});
it("should roll the dice correctly with modifier", () => {
	const result = core.roll("2d6+3");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6+3");
	expect(result!.total).toBeGreaterThanOrEqual(5);
	expect(result!.total).toBeLessThanOrEqual(15);
});
it("should roll the dice correctly with comparison", () => {
	const result = core.roll("2d6>5");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(2);
	expect(result!.total).toBeLessThanOrEqual(12);
});
it("should roll the dice correctly with multiple dice", () => {
	const result = core.roll("2#2d6");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(4);
	expect(result!.total).toBeLessThanOrEqual(24);
});

describe("Shared results", () => {
	it("should allow to keep the result in a dice with &", () => {
		const result = core.roll("2d6;&+2");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
	});
	it("should allow to keep the result in a dice with & and comparison", () => {
		const result = core.roll("2d6;&+2>5");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
	});
});

describe("Test with formula", () => {
	it("simple roll", () => {
		const dice = "1d20+$>20";
		const userStat = 10;
		const calculation = core.replaceFormulaInDice(
			dice.replaceAll("$", userStat.toString())
		);
		const formula = `${calculation} coucou`;
		const expectedFormula = "1d20+10>20 coucou";
		expect(formula).toEqual(expectedFormula);
	});
	it("success formula", () => {
		const dice = "1d20+5>{{$*2}}";
		const userStat = 10;
		const calculation = core.replaceFormulaInDice(
			dice.replaceAll("$", userStat.toString())
		);
		const formula = `${calculation} coucou`;
		const expectedFormula = "1d20+5>20 coucou";
		expect(formula).toEqual(expectedFormula);
	});
	it("complicated formula", () => {
		const dice = "1d20+{{ceil((10-$)/2)}}>20";
		const userStat = 5;
		const calculation = core.replaceFormulaInDice(
			dice.replaceAll("$", userStat.toString())
		);
		const formula = `${calculation} coucou`;
		const expectedFormula = "1d20+3>20 coucou";
		expect(formula).toEqual(expectedFormula);
	});
	it("negative formula", () => {
		const dice = "1d20+{{ceil(($-10)/2)}}>20";
		const userStat = 5;
		const calculation = core.replaceFormulaInDice(
			dice.replaceAll("$", userStat.toString())
		);
		const expectedFormula = "1d20-2>20";
		expect(calculation).toEqual(expectedFormula);
	});
});
