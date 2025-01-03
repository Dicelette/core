import { expect, it } from "bun:test";
import * as core from "../src";

it("should roll the dice correctly", () => {
	const result = core.roll("2d6");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(2);
	expect(result!.total).toBeLessThanOrEqual(12);
});
it("should roll the dice correctly with modifier", () => {
	const result = core.roll("2d6+3");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6+3");
	expect(result!.total).toBeGreaterThanOrEqual(5);
	expect(result!.total).toBeLessThanOrEqual(15);
});
it("should roll the dice correctly with comparison", () => {
	const result = core.roll("2d6>5");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(2);
	expect(result!.total).toBeLessThanOrEqual(12);
});
it("should roll the dice correctly with multiple dice", () => {
	const result = core.roll("2#2d6");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
	expect(result!.total).toBeGreaterThanOrEqual(4);
	expect(result!.total).toBeLessThanOrEqual(24);
});

it("should allow to keep the result in a dice with &", () => {
	const result = core.roll("2d6;&+2");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
});
it("should allow to keep the result in a dice with & and comparison", () => {
	const result = core.roll("2d6;&+2>5");
	expect(result).not.toBeUndefined();
	expect(result!.dice).toEqual("2d6");
});
