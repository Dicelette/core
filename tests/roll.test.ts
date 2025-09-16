import { describe, expect, it } from "bun:test";
import * as core from "../src";
import {DiceRoller} from "@dice-roller/rpg-dice-roller";
import {isArray} from "mathjs";

function roll(dice: string) {
	const roller = new DiceRoller();
	const res = roller.roll(dice);
	return isArray(res) ? res[0] : res;
}

describe("passing", () => {
	it("simple", () => {
		const result = core.roll("2d6");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result!.total).toBeGreaterThanOrEqual(2);
		expect(result!.total).toBeLessThanOrEqual(12);
		const rollResult = roll("2d6");
		expect(result!.dice).toEqual(rollResult.notation);
	});
	
	it("valid even when starting with +", () => {
		const result = core.roll("+2d6");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result!.total).toBeGreaterThanOrEqual(2);
		expect(result!.total).toBeLessThanOrEqual(12);
	});
	it("modifier", () => {
		const result = core.roll("2d6+3");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6+3");
		expect(result!.total).toBeGreaterThanOrEqual(5);
		expect(result!.total).toBeLessThanOrEqual(15);
	});
	it("comparison", () => {
		const result = core.roll("2d6>5");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result!.total).toBeGreaterThanOrEqual(2);
		expect(result!.total).toBeLessThanOrEqual(12);
	});
	it("Simple with inverted sign (2d6=>5)", () => {
		const result = core.roll("1d100=>80");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("1d100");
		expect(result!.total).toBeGreaterThanOrEqual(1);
		expect(result!.total).toBeLessThanOrEqual(100);
	});
	it("multiple dice", () => {
		const result = core.roll("2#2d6");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result!.total).toBeGreaterThanOrEqual(4);
		expect(result!.total).toBeLessThanOrEqual(24);
	});
});

describe("Shared results", () => {
	it("simple", () => {
		const result = core.roll("2d6;&+2");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
	});
	it("should be valid when starting with +", () => {
		const result = core.roll("+2d6;&+2");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
	});
	it("comparison", () => {
		const result = core.roll("2d6;&+2>5");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
	});
	describe("comments", () => {
		it("simple", () => {
			const result = core.roll("2d6 [foo];&+2 [toto]");
			expect(result).not.toBeUndefined();
			expect(result?.result).toMatch(
				/※ __foo__ — 2d6: \[.*?] = \d+;◈ __toto__ — \[2d6]\+2: \[\d+]\+2 = \d+/
			);
		});
		it("parentesis in it", () => {
			const result = core.roll("2d6 [foo (bar)];&+2 [toto]");
			expect(result).not.toBeUndefined();
			expect(result?.result).toMatch(
				/※ __foo \(bar\)__ — 2d6: \[.*?] = \d+;◈ __toto__ — \[2d6]\+2: \[\d+]\+2 = \d+/
			);
		});
	});
});
