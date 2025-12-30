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
		expect(result!.dice).toEqual("2d4+1");
		expect(result!.total).toBeGreaterThanOrEqual(6);
		expect(result!.total).toBeLessThanOrEqual(27);
		expect(result?.result).toMatch(
			/2d4\+1: \[\d+, \d+\]\+1 = \d+; 2d4\+1: \[\d+, \d+\]\+1 = \d+; 2d4\+1: \[\d+, \d+\]\+1 = \d+/
		);
	});
});
