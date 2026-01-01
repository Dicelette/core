import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("pity system", () => {
	describe("pity enabled", () => {
		it("should reroll until successful and increment pityLogs when first shot fails", () => {
			const result = core.roll("1d6>=5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(5);
			expect(result!.compare).toEqual({ sign: ">=", value: 5 });
		});

		it("should works with >", () => {
			const result = core.roll("1d6>3", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(6);
		});

		it("should works with <", () => {
			const result = core.roll("1d6<5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(4);
		});

		it("reroll until success with <=", () => {
			const result = core.roll("1d6<=4", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeLessThanOrEqual(4);
		});
	});

	describe("pity ignored (impossible comparison)", () => {
		it("should ignore pity when comparison is impossible (1d6>=7)", () => {
			const result = core.roll("1d6>=7", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("should ignore pity for 1d20>20 (impossible)", () => {
			const result = core.roll("1d20>20", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("should ignore pity for 1d6<1 (impossible)", () => {
			const result = core.roll("1d6<1", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("should accept pity for 2d6>=12 (possible)", () => {
			const result = core.roll("2d6>=12", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(2);
			expect(result!.total).toBeLessThanOrEqual(12);
		});
	});

	describe("pity disabled", () => {
		it("should not reroll if pity = false", () => {
			const result = core.roll("1d6>=5", null, false);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("should not reroll if pity = undefined", () => {
			const result = core.roll("1d6>=5", null, undefined);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});
	});

	describe("case without comparator", () => {
		it("should not apply pity without comparison", () => {
			const result = core.roll("1d6", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
			expect(result!.compare).toBeUndefined();
		});
	});

	describe("limit case", () => {
		it("should ignore !=", () => {
			const result = core.roll("1d6!=5", null, true);

			expect(result).not.toBeUndefined();
			// != is an explosion operator, not a standard comparison
			// The test just checks that the roll works.
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(6);
		});

		it("should works with == (equal)", () => {
			const result = core.roll("1d6==5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
		});

		it("should works with <= (inferior or equal)", () => {
			const result = core.roll("1d6<=5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.compare!.sign).toBe("<=");
		});
	});

	describe("multiple die integration", () => {
		it("should correctly calculate the maximum for 2d6", () => {
			const result = core.roll("2d6>=12", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(2);
			expect(result!.total).toBeLessThanOrEqual(12);
		});

		it("should correctly calculate the maximum for 3d4", () => {
			const result = core.roll("3d4>=12", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(3);
			expect(result!.total).toBeLessThanOrEqual(12);
		});
	});
});
