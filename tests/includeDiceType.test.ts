import { describe, expect, it } from "bun:test";
import { includeDiceType } from "../src";

describe("includeDiceType", () => {
	it("matches a simple dice type", () => {
		expect(includeDiceType("1d100", "d100")).toBe(true);
		expect(includeDiceType("1d100", "d20")).toBe(false);
	});

	it("treats a `+` in the dice type as literal text, not a regex quantifier", () => {
		// Without escaping, "1d6+2" compiles to a pattern where "+" means "one or more
		// of the previous token", so it would wrongly match dice like "1d666+2".
		expect(includeDiceType("1d6+2", "1d6+2")).toBe(true);
		expect(includeDiceType("1d666+2", "1d6+2")).toBe(false);
	});

	it("still resolves the $ wildcard for user stats", () => {
		expect(includeDiceType("1d20+strength", "$+strength", true)).toBe(true);
	});

	it("does not hang on a GM-uploaded dice type shaped like a catastrophic-backtracking regex", () => {
		// The trailing "!" guarantees the match can never reach end-of-string (the
		// literal, unescaped "$" in the dice type), forcing the regex engine to
		// exhaust every partition of the `a` run before giving up on unescaped input.
		const start = performance.now();
		const result = includeDiceType(`${"a".repeat(40)}!`, "(a+)+$");
		expect(performance.now() - start).toBeLessThan(200);
		expect(result).toBe(false);
	});
});
