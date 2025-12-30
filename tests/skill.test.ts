import { expect, it } from "bun:test";
import * as core from "../src";

it("creating roll dice with face formula", () => {
	let dice = "1dstat1>20";
	const userStat = {
		stat1: 5,
		stat2: 10,
	};
	dice = core.generateStatsDice(dice, userStat);
	const formula = `${dice} # cc`;
	const expectedFormula = "1d5>20 # cc";
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
	const formula = `${dice} # cc`;
	const expectedFormula = "1d20+5>3 # cc";
	expect(formula).toEqual(expectedFormula);
});
it("creating complicated roll dice with comparator as formula", () => {
	let dice = "1d{{round(Endurance/4)}} + 1d40 + 20 >=40";
	const userStat = {
		endurance: 40,
	};
	dice = core.generateStatsDice(dice, userStat);
	const formula = `${dice} cc`;
	const expectedFormula = "1d10 + 1d40 + 20 >=40 cc";
	expect(formula).toEqual(expectedFormula);
});
it("creating complicated roll with multiple stats", () => {
	let dice = "1d{{round(technique/4)}}+5d{{round(endurance/4)}}";
	const userStat = {
		technique: 40,
		endurance: 25,
	};
	dice = core.generateStatsDice(dice, userStat);
	const formula = dice;
	const expectedFormula = "1d10+5d6";
	expect(formula).toEqual(expectedFormula);
});
