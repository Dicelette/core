import { expect, it } from "bun:test";
import * as core from "../src";

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
