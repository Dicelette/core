import { describe, expect, it } from "vitest";
import { getCompare } from "../src/dice/compare";
import { SIGN_REGEX_SPACE } from "../src";

function compareOf(dice: string) {
	const compareRegex = dice.match(SIGN_REGEX_SPACE);
	if (!compareRegex) throw new Error(`"${dice}" does not match SIGN_REGEX_SPACE`);
	return getCompare(dice, compareRegex, null, false);
}

describe("getCompare — basic operators", () => {
	it.each([
		[">=", "1d20>=10"],
		[">", "1d20>10"],
		["<", "1d20<10"],
		["<=", "1d20<=10"],
		["=", "1d20=10"],
		["==", "1d20==10"],
		["!=", "1d20!=10"],
	])("parses the %s operator", (sign, dice) => {
		const { compare } = compareOf(dice);
		expect(compare).toBeDefined();
		expect(compare!.sign).toBe(sign);
		expect(compare!.value).toBe(10);
	});

	it("strips the comparison suffix from the returned dice string", () => {
		const { dice } = compareOf("1d20>=10");
		expect(dice).toBe("1d20");
	});
});

describe("getCompare — compared value as an expression", () => {
	it("resolves an arithmetic expression on the right-hand side", () => {
		const { compare } = compareOf("1d20>=2+3");
		expect(compare).toBeDefined();
		expect(compare!.sign).toBe(">=");
		expect(compare!.value).toBe(5);
	});

	it("rolls a dice expression combined with a modifier on the right-hand side", () => {
		const { compare } = compareOf("1d20>=1d1+2");
		expect(compare).toBeDefined();
		expect(compare!.sign).toBe(">=");
		// 1d1 always rolls 1, so 1d1+2 always resolves to 3
		expect(compare!.value).toBe(3);
		expect(compare!.originalDice).toBe("1d1+2");
	});

	it("rolls a plain dice expression on the right-hand side (no arithmetic sign)", () => {
		const { compare } = compareOf("1d20>=1d1");
		expect(compare).toBeDefined();
		expect(compare!.sign).toBe(">=");
		expect(compare!.value).toBe(1);
		expect(compare!.originalDice).toBe("1d1");
	});
});

describe("getCompare — dice pool / group notation", () => {
	// See the doc comment on getCompare: {2d3}>=4 keeps the normal comparison,
	// while {2d3>=4} and {2d3,1d4}>=4 use the pool "count of successes" notation
	// and must NOT be treated as a normal comparison by getCompare.
	it("keeps the comparison for a simple wrapped group ({2d3}>=4)", () => {
		const { dice, compare } = compareOf("{2d3}>=4");
		expect(compare).toBeDefined();
		expect(compare!.sign).toBe(">=");
		expect(compare!.value).toBe(4);
		expect(dice).toBe("{2d3}");
	});

	it("skips the comparison when it is embedded inside the group ({2d3>=4})", () => {
		const result = compareOf("{2d3>=4}");
		expect(result.compare).toBeUndefined();
		expect(result.dice).toBe("{2d3>=4}");
	});

	it("skips the comparison for a comma-separated pool ({2d3,1d4}>=4)", () => {
		const result = compareOf("{2d3,1d4}>=4");
		expect(result.compare).toBeUndefined();
		expect(result.dice).toBe("{2d3,1d4}>=4");
	});

	it("skips the comparison for a pool with more than two members", () => {
		const result = compareOf("{2d3,1d4,1d6}>=4");
		expect(result.compare).toBeUndefined();
	});
});

describe("getCompare — ReDoS regression (catastrophic backtracking guard)", () => {
	// Regression test for the exponential-backtracking bug in the pool-notation
	// regex: a `{` followed by many comma-separated segments and no closing `}`
	// used to make the match take seconds (and grow exponentially with input size).
	// See core/src/dice/compare.ts — the pattern now uses bounded `[^}]*` groups.
	it("resolves near-instantly on an adversarial unclosed group", () => {
		const malicious = `{${"a,".repeat(40)}x>=1`;
		const start = performance.now();
		compareOf(malicious);
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(200);
	});

	it("resolves near-instantly on a longer adversarial payload", () => {
		const malicious = `{${"a,".repeat(500)}x>=1`;
		const start = performance.now();
		compareOf(malicious);
		const elapsed = performance.now() - start;
		expect(elapsed).toBeLessThan(200);
	});
});
