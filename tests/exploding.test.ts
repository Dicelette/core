import { expect, it } from "bun:test";
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
