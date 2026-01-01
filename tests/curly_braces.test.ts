import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("Simple dice with curly braces", () => {
	it("should roll dice wrapped in curly braces with modifier", () => {
		const result = core.roll("{1d20+5}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d20+5}");
		expect(result!.total).toBeGreaterThanOrEqual(6);
		expect(result!.total).toBeLessThanOrEqual(25);
	});

	it("should roll dice wrapped in curly braces with comparison", () => {
		const result = core.roll("{1d20>10}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d20>10}");
		// Result should contain comparison output
		expect(result?.result).toBeDefined();
	});

	it("should roll dice wrapped in curly braces with modifier and comparison", () => {
		const result = core.roll("{1d20+5>10}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d20+5>10}");
		expect(result!.total).toBeGreaterThanOrEqual(6); // 1d20+5 = min 6
		expect(result!.total).toBeLessThanOrEqual(25); // 1d20+5 = max 25
		expect(result!.compare?.sign).toEqual(">");
		expect(result!.compare?.value).toEqual(10);
	});

	it("should handle dice with multiple modifiers and comparison", () => {
		const result = core.roll("{2d6+3-1>5}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{2d6+3-1>5}");
	});

	it("should roll simple dice in curly braces", () => {
		const result = core.roll("{1d6}");
		expect(result).not.toBeUndefined();
		expect(result!.dice).toEqual("{1d6}");
		expect(result!.total).toBeGreaterThanOrEqual(1);
		expect(result!.total).toBeLessThanOrEqual(6);
	});

	it("should work with various comparison operators", () => {
		const operators = [">", "<", ">=", "<=", "!="];
		for (const op of operators) {
			const result = core.roll(`{1d20${op}10}`);
			expect(result).not.toBeUndefined();
			expect(result!.dice).toEqual(`{1d20${op}10}`);
		}
	});
});
