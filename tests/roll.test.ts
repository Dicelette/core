import { describe, expect, it } from "bun:test";
import { DiceRoller, NumberGenerator } from "@dice-roller/rpg-dice-roller";
import { isArray } from "mathjs";
import * as core from "../src";

function roll(dice: string) {
	const roller = new DiceRoller();
	NumberGenerator.generator.engine = NumberGenerator.engines.nodeCrypto;
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
		expect(result!.compare).toEqual({ sign: ">", value: 5 });
	});
	it("Simple with inverted sign (2d6=>5)", () => {
		const result = core.roll("1d100=>80");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("1d100");
		expect(result!.total).toBeGreaterThanOrEqual(1);
		expect(result!.total).toBeLessThanOrEqual(100);
		expect(result!.compare).toEqual({ sign: ">=", value: 80 });
	});
	it("multiple dice", () => {
		const result = core.roll("2#2d6");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result!.total).toBeGreaterThanOrEqual(4);
		expect(result!.total).toBeLessThanOrEqual(24);
		expect(result?.result).toMatch(/2d6: \[\d+, \d+\] = \d+; 2d6: \[\d+, \d+\] = \d+/)
	});
});

describe("Shared results", () => {
	it("simple", () => {
		const result = core.roll("2d6;&+2");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result?.result).toMatch(/※ 2d6: \[\d+, \d+\] = \d+;◈ \[2d6\]\+2: \[\d+\]\+2 = \d+/);
	});
	it("should be valid when starting with +", () => {
		const result = core.roll("+2d6;&+2");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result?.result).toMatch(/※ 2d6: \[\d+, \d+\] = \d+;◈ \[2d6\]\+2: \[\d+\]\+2 = \d+/);

	});
	it("comparison", () => {
		const result = core.roll("2d6;&+2>5");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("2d6");
		expect(result?.result).toMatch(/※ 2d6: \[\d+, \d+\] = \d+;✓ \[2d6\]\+2>5: \[\d+\]\+2>5 = \d+.5/);
	});
	describe("comments", () => {
		it("simple", () => {
			const result = core.roll("2d6[foo];&+2[toto]");
			expect(result).not.toBeUndefined();
			expect(result?.result).toMatch(
				/※ __foo__ — 2d6: \[.*?] = \d+;◈ __toto__ — \[2d6]\+2: \[\d+]\+2 = \d+/
			);
		});
		it("parentesis in it", () => {
			const result = core.roll("2d6[foo (bar)];&+2[toto]");
			expect(result).not.toBeUndefined();
			expect(result?.result).toMatch(
				/※ __foo \(bar\)__ — 2d6: \[.*?] = \d+;◈ __toto__ — \[2d6]\+2: \[\d+]\+2 = \d+/
			);
		});
	});
});
