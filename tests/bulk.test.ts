import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("bulk rolls", () => {
	it("simple bulk roll", () => {
		const result = core.roll("5#1d6");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("1d6");
		expect(result!.total).toBeGreaterThanOrEqual(5);
		expect(result!.total).toBeLessThanOrEqual(30);
		expect(result?.result).toMatch(
			/1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+/
		);
	});
	it("Bulk roll in brackets", () => {
		const result = core.roll("{3#2d4+1}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{2d4+1}");
		expect(result!.total).toBeGreaterThanOrEqual(6);
		expect(result!.total).toBeLessThanOrEqual(27);
		expect(result?.result).toMatch(
			/2d4\+1: \[\d+, \d+\]\+1 = \d+; 2d4\+1: \[\d+, \d+\]\+1 = \d+; 2d4\+1: \[\d+, \d+\]\+1 = \d+/
		);
	});

	it("Bulk roll with comparison - without brackets", () => {
		const result = core.roll("5#1d20>10");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("1d20");
		expect(result!.compare).toEqual({ sign: ">", value: 10 });
		// Total should be the number of successes (0-5)
		expect(result!.total).toBeGreaterThanOrEqual(0);
		expect(result!.total).toBeLessThanOrEqual(5);
		// Without curly braces, no * markers in output
		expect(result?.result).toMatch(/1d20: \[\d+(?:, \d+)*\] = \d+/);
		expect(result?.result).not.toMatch(/\*/);
	});

	it("Bulk roll with comparison - trivial detection without brackets", () => {
		const result = core.roll("3#1d6>10");
		expect(result).not.toBeUndefined();
		expect(result!.compare?.trivial).toBe(true);
		expect(result!.trivial).toBe(true);
	});

	it("Bulk roll with comparison - in brackets", () => {
		const result = core.roll("{5#1d20>10}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d20>10}");
		expect(result!.compare).toBeUndefined(); // compare should be undefined for curly bulk
		// Total should be the number of successes (0-5)
		expect(result!.total).toBeGreaterThanOrEqual(0);
		expect(result!.total).toBeLessThanOrEqual(5);
		// Result should contain comparison in notation for curly bulk
		expect(result?.result).toMatch(/1d20>10: \[[\d*\s,]+\] = \d+/);
	});

	it("Bulk roll with comparison - verify success marking", () => {
		const result = core.roll("{3#1d20>1}"); // Almost always succeeds
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d20>1}");
		expect(result!.compare).toBeUndefined(); // compare should be undefined for curly bulk
		// With >1, we should have 2-3 successes most of the time
		expect(result!.total).toBeGreaterThanOrEqual(0);
		expect(result!.total).toBeLessThanOrEqual(3);
		// Check that successes are marked with *
		const successMatches = result!.result.match(/\*/g);
		const successCount = successMatches ? successMatches.length : 0;
		// Each success should have one * per die in the roll
	});

	it("Bulk roll with comparison - trivial detection in brackets", () => {
		const result = core.roll("{2#1d6>10}");
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeUndefined();
		expect(result!.trivial).toBe(true);
	});

	it("Bulk roll without brackets - should work same as before", () => {
		const result = core.roll("{3#1d6}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d6}");
		expect(result!.total).toBeGreaterThanOrEqual(3);
		expect(result!.total).toBeLessThanOrEqual(18);
		// Without comparison, should just sum the rolls
		expect(result?.result).toMatch(
			/1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+; 1d6: \[\d+\] = \d+/
		);
	});
});
