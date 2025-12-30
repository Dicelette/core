import { expect, it } from "bun:test";
import * as core from "../src";

// Add more tests for different scenarios
it("should verify the random generator correctly", () => {
	const total = 100;
	const max = 50;
	const min = 10;
	const result = core.generateRandomStat(total, max, min);
	expect(result).toBeGreaterThanOrEqual(min);
	expect(result).toBeLessThanOrEqual(max);
	expect(result).toBeLessThanOrEqual(total);
});

it("should verify with no max", () => {
	const total = 100;
	const min = 1;
	const result = core.generateRandomStat(total, undefined, min);
	expect(result).toBeGreaterThanOrEqual(min);
	expect(result).toBeLessThanOrEqual(total);
});

it("should verify with no min", () => {
	const total = 100;
	const max = 99;
	const result = core.generateRandomStat(total, max, undefined);
	expect(result).toBeGreaterThanOrEqual(0);
	expect(result).toBeLessThanOrEqual(max);
});

it("should verify with no min and max", () => {
	const total = 100;
	const result = core.generateRandomStat(total, undefined, undefined);
	expect(result).toBeGreaterThanOrEqual(0);
	expect(result).toBeLessThanOrEqual(total);
});

it("should verify with no total", () => {
	const max = 99;
	const min = 1;
	const result = core.generateRandomStat(undefined, max, min);
	expect(result).toBeGreaterThanOrEqual(min);
	expect(result).toBeLessThanOrEqual(max);
});

it("should verify with no total, min and max", () => {
	const result = core.generateRandomStat(undefined, undefined, undefined);
	expect(result).toBeGreaterThanOrEqual(0);
	expect(result).toBeLessThanOrEqual(100);
});
