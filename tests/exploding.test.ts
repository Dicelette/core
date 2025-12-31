import { describe, expect, it } from "bun:test";
import * as core from "../src";

const dices = ["2d6!>4", "2d6!<5", "2d6!>=4", "2d6!<=4", "2d6!<>4"];

dices.forEach((dice) => {
	it(`exploding dice without compare: ${dice}`, () => {
		const result = core.roll(dice);
		expect(result).toBeDefined();
		expect(result!.compare).toBeUndefined();
	});
});

const validCompare = ["2d6>4", "2d6>=4", "2d6!=4", "2d6<4", "2d6<=4"];

validCompare.forEach((dice) => {
	it(`valid compare with dice: ${dice}`, () => {
		const result = core.roll(dice);
		expect(result).toBeDefined();
		expect(result!.compare).toBeDefined();
	});
});

const countCompare = validCompare.map((dice) => `{${dice}}`);

countCompare.forEach((dice) => {
	it(`count compare with dice: ${dice}`, () => {
		const result = core.roll(dice);
		expect(result).toBeDefined();
		expect(result!.compare).toBeUndefined();
	});
});

it("exploding dice with double sign counts successes", () => {
	const result = core.roll("4d10!>>7");
	expect(result).toBeDefined();
	if (!result) return;
	const bracketContent = result.result.match(/\[([^\]]+)\]/)?.[1] ?? "";
	const values = bracketContent
		.split(",")
		.map((v) => Number.parseInt(v.replace(/!/g, "").trim(), 10))
		.filter((v) => !Number.isNaN(v));
	const successes = values.filter((v) => v > 7).length;
	expect(result.total).toBe(successes);
	expect(result.dice).toContain("!>>");
});

function extractValues(result: string): number[] {
	const bracketContent = result.match(/\[([^\]]+)\]/)?.[1] ?? "";
	return bracketContent
		.split(",")
		.map((v) => Number.parseInt(v.replace(/!/g, "").trim(), 10))
		.filter((v) => !Number.isNaN(v));
}

const doubleSigns: Array<{
	notation: string;
	check: (v: number) => boolean;
}> = [
	{ notation: "4d10!>>7", check: (v) => v > 7 },
	{ notation: "4d10!>>=6", check: (v) => v >= 6 },
	{ notation: "4d10!<<4", check: (v) => v < 4 },
	{ notation: "4d10!<<=5", check: (v) => v <= 5 },
	{ notation: "4d10!==3", check: (v) => v !== 3 },
	{ notation: "4d10!!==3", check: (v) => v === 3 },
];

doubleSigns.forEach(({ notation, check }) => {
	it(`double sign exploding counts successes: ${notation}`, () => {
		const result = core.roll(notation);
		expect(result).toBeDefined();
		if (!result) return;
		const values = extractValues(result.result);
		const successes = values.filter(check).length;
		expect(result.total).toBe(successes);
		expect(result.compare).toBeUndefined();
		expect(result.dice).toContain("!");
		expect(result.dice).toContain(notation.split("!")[1]);
	});

	it(`single sign exploding keeps compare undefined: ${notation.replace("!!", "!")}`, () => {
		const singleNotation = notation
			.replace("!!", "!")
			.replace(/!(>>=|<<=|>>|<<|==|!==)/, "!>");
		const r = core.roll(singleNotation);
		expect(r).toBeDefined();
		if (!r) return;
		expect(r.compare).toBeUndefined();
	});
});

describe("Should work in bulks", () => {
	const notations = [
		"4#2d6!>>4",
		"3#3d8!<<5",
		"2#5d10!>>=7",
		"6#1d20!<<=10",
		"5#4d12!==6",
	];
	notations.forEach((notation) => {
		it(`bulk rolling: ${notation}`, () => {
			const result = core.roll(notation);
			expect(result).toBeDefined();
			if (!result) return;
			const individualResults = result.result.split(";");
			expect(individualResults.length).toBe(Number.parseInt(notation.split("#")[0], 10));

			const checkSign = notation.match(/(>>=|<<=|>>|<<|==|!==)/)?.[0] ?? "";
			const checkValue = Number.parseInt(notation.split(checkSign)[1], 10);
			let checkFunction: (v: number) => boolean;
			switch (checkSign) {
				case ">>":
					checkFunction = (v) => v > checkValue;
					break;
				case ">>=":
					checkFunction = (v) => v >= checkValue;
					break;
				case "<<":
					checkFunction = (v) => v < checkValue;
					break;
				case "<<=":
					checkFunction = (v) => v <= checkValue;
					break;
				case "==":
					checkFunction = (v) => v === checkValue;
					break;
				case "!==":
					checkFunction = (v) => v !== checkValue;
					break;
				default:
					checkFunction = () => false;
			}

			let aggregatedSuccesses = 0;
			individualResults.forEach((res) => {
				const values = extractValues(res);
				const successes = values.filter(checkFunction).length;
				aggregatedSuccesses += successes;
				expect(result.dice).toContain("!");
			});

			expect(result.total).toBe(aggregatedSuccesses);
		});
	});
});

describe("Should work in shared rolls", () => {
	const cases = [
		{ notation: "2d6!>>4;&*0", check: (v: number) => v > 4 },
		{ notation: "3d8!>>=6;&*0", check: (v: number) => v >= 6 },
		{ notation: "4d10!<<5;&*0", check: (v: number) => v < 5 },
		{ notation: "5d12!<<=3;&*0", check: (v: number) => v <= 3 },
		{ notation: "6d6!==2;&*0", check: (v: number) => v !== 2 },
		{ notation: "3d6!!==4;&*0", check: (v: number) => v === 4 },
	];

	cases.forEach(({ notation, check }) => {
		it(`shared roll keeps success counting: ${notation}`, () => {
			const result = core.roll(notation);
			expect(result).toBeDefined();
			if (!result) return;
			// First segment is before the first ';'
			const firstSegment = result.result.split(";")[0] ?? "";
			const values = extractValues(firstSegment);
			const successes = values.filter(check).length;
			expect(result.total).toBe(successes); // &*0 should not alter total
			expect(result.compare).toBeUndefined();
			expect(result.dice).toContain("!");
			expect(result.dice).toContain(notation.split("!")[1]);
		});
	});
});
