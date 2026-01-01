import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("detection of trivial comparisons in normal dice", () => {
	it("1d6>=7 (always false)", () => {
		const result = core.roll("1d6>=7", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d20>20 (always false)", () => {
		const result = core.roll("1d20>20", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d6<1 (always false)", () => {
		const result = core.roll("1d6<1", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d6>=1 (always true)", () => {
		const result = core.roll("1d6>=1", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d20<=20 (always true)", () => {
		const result = core.roll("1d20<=20", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("2d6<2 (always false)", () => {
		const result = core.roll("2d6<2", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("2d6>12 (always false)", () => {
		const result = core.roll("2d6>12", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});
});
describe("non-trivial comparisons", () => {
	it("1d6>=3", () => {
		const result = core.roll("1d6>=3", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("2d6>=12", () => {
		const result = core.roll("2d6>=12", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d20>10", () => {
		const result = core.roll("1d20>10", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("3d4<=3", () => {
		const result = core.roll("3d4<=3", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d100<2", () => {
		const result = core.roll("1d100<2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});
});

describe("detection in bulk rolls", () => {
	it("should be true (5#1d6>6)", () => {
		const result = core.roll("5#1d6>6", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
		expect(result!.trivial).toBe(true);
	});

	it("should be false (5#1d6>3)", () => {
		const result = core.roll("5#1d6>3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
		expect(result!.trivial).toBeUndefined();
	});
});

describe("shared dices", () => {
	it("should be true (1d6;&>6)", () => {
		const result = core.roll("1d6;&>6", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
		expect(result!.trivial).toBe(true);
	});

	it("should be false (1d6;&>3)", () => {
		const result = core.roll("1d6;&>3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
		expect(result!.trivial).toBeUndefined();
	});
});

describe("bornes verification", () => {
	it("1d100<2", () => {
		const result = core.roll("1d100<2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// min=1
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d6>5", () => {
		const result = core.roll("1d6>5", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// max=6
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d6<=1", () => {
		const result = core.roll("1d6<=1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// max=6
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d20>1", () => {
		const result = core.roll("1d20>1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// max=20, min=1 so the comparison is not trivial
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("3d4<=3", () => {
		const result = core.roll("3d4<=3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// max=12, min=3 so 3<=3 can be true
		expect(result!.compare!.trivial).toBeUndefined();
	});

	describe("trivial cases", () => {
		it("3d4<3", () => {
			const result = core.roll("3d4<3", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// min = 3, so never < 3
			expect(result!.compare!.trivial).toBe(true);
		});

		it("1d100>=1", () => {
			const result = core.roll("1d100>=1", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// min = 1
			expect(result!.compare!.trivial).toBe(true);
		});

		it("1d100<=100", () => {
			const result = core.roll("1d100<=100", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			//max = 100
			expect(result!.compare!.trivial).toBe(true);
		});

		it("1d100>100", () => {
			const result = core.roll("1d100>100", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// max = 100 so never >100
			expect(result!.compare!.trivial).toBe(true);
		});

		it("1d100<1", () => {
			const result = core.roll("1d100<1", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// min = 1 so never <1
			expect(result!.compare!.trivial).toBe(true);
		});

		it("2d6>=2", () => {
			const result = core.roll("2d6>=2", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// min = 2
			expect(result!.compare!.trivial).toBe(true);
		});

		it("2d6>13", () => {
			const result = core.roll("2d6>13", null, false);
			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
			// max=12
			expect(result!.compare!.trivial).toBe(true);
		});
	});
});
