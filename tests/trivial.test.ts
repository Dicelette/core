import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("détection des comparaisons triviales dans des dés normaux", () => {
	it("devrait marquer trivial=true pour 1d6>=7 (toujours faux)", () => {
		const result = core.roll("1d6>=7", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 1d20>20 (toujours faux)", () => {
		const result = core.roll("1d20>20", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 1d6<1 (toujours faux)", () => {
		const result = core.roll("1d6<1", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 1d6>=1 (toujours vrai)", () => {
		const result = core.roll("1d6>=1", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 1d20<=20 (toujours vrai)", () => {
		const result = core.roll("1d20<=20", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 2d6<2 (toujours faux)", () => {
		const result = core.roll("2d6<2", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("devrait marquer trivial=true pour 2d6>12 (toujours faux)", () => {
		const result = core.roll("2d6>12", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("NE devrait PAS marquer trivial pour 1d6>=3 (peut être vrai ou faux)", () => {
		const result = core.roll("1d6>=3", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("NE devrait PAS marquer trivial pour 2d6>=12 (peut être vrai ou faux)", () => {
		const result = core.roll("2d6>=12", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("NE devrait PAS marquer trivial pour 1d20>10 (peut être vrai ou faux)", () => {
		const result = core.roll("1d20>10", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("devrait marquer trivial=true pour 3d4>=13 (toujours faux)", () => {
		const result = core.roll("3d4>=13", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
	});

	it("ne devrait pas marquer trivial pour 3d4<=3", () => {
		const result = core.roll("3d4<=3", null, false);

		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("ne devrait pas marquer trivial pour 1d100<2", () => {
		const result = core.roll("1d100<2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
	});
});
describe("détection des comparaisons triviales dans des dés en bulk ou partagés", () => {
	it("Devrait détecter les comparaison trivial dans un bulk", () => {
		const result = core.roll("5#1d6>6", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
		expect(result!.trivial).toBe(true);
	});

	it("Ne devrait PAS détecter les comparaison trivial dans un bulk non trivial", () => {
		const result = core.roll("5#1d6>3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
		expect(result!.trivial).toBeUndefined();
	});
});

describe("détection des comparaisons triviales dans des shared dices", () => {
	it("Devrait pouvoir détecter les trivial dans un shared roll", () => {
		const result = core.roll("1d6;&>6", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBe(true);
		expect(result!.trivial).toBe(true);
	});

	it("Ne devrait PAS détecter les trivial dans un shared roll non trivial", () => {
		const result = core.roll("1d6;&>3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		expect(result!.compare!.trivial).toBeUndefined();
		expect(result!.trivial).toBeUndefined();
	});
});

describe("vérification des bornes", () => {
	it("1d100<2 devrait pouvoir réussir (quand le dé fait 1)", () => {
		const result = core.roll("1d100<2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison n'est pas triviale car elle peut réussir (1 < 2)
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d6>5 devrait pouvoir réussir (quand le dé fait 6)", () => {
		const result = core.roll("1d6>5", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison n'est pas triviale car elle peut réussir (6 > 5)
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d6<=1 devrait pouvoir réussir (quand le dé fait 1)", () => {
		const result = core.roll("1d6<=1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison n'est pas triviale car elle peut réussir (1 <= 1)
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("1d20>1 devrait pouvoir réussir (quand le dé fait >= 2)", () => {
		const result = core.roll("1d20>1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison n'est pas triviale car elle peut réussir
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("2d6<2 devrait être trivial (impossible, min = 2)", () => {
		const result = core.roll("2d6<2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours faux (min = 2, donc jamais < 2)
		expect(result!.compare!.trivial).toBe(true);
	});

	it("3d4<=3 devrait pouvoir réussir (quand les dés font 1+1+1)", () => {
		const result = core.roll("3d4<=3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison n'est pas triviale car elle peut réussir
		expect(result!.compare!.trivial).toBeUndefined();
	});

	it("3d4<3 devrait être trivial (impossible, min = 3)", () => {
		const result = core.roll("3d4<3", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours faux (min = 3, donc jamais < 3)
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d100>=1 devrait être trivial (toujours vrai)", () => {
		const result = core.roll("1d100>=1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours vrai
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d100<=100 devrait être trivial (toujours vrai)", () => {
		const result = core.roll("1d100<=100", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours vrai
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d100>100 devrait être trivial (toujours faux)", () => {
		const result = core.roll("1d100>100", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours faux
		expect(result!.compare!.trivial).toBe(true);
	});

	it("1d100<1 devrait être trivial (toujours faux)", () => {
		const result = core.roll("1d100<1", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours faux (min = 1, donc jamais < 1)
		expect(result!.compare!.trivial).toBe(true);
	});

	it("2d6>=2 devrait être trivial (toujours vrai)", () => {
		const result = core.roll("2d6>=2", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours vrai (min = 2)
		expect(result!.compare!.trivial).toBe(true);
	});

	it("2d6>13 devrait être trivial (toujours faux)", () => {
		const result = core.roll("2d6>13", null, false);
		expect(result).not.toBeUndefined();
		expect(result!.compare).toBeDefined();
		// La comparaison est triviale car c'est toujours faux (max = 12)
		expect(result!.compare!.trivial).toBe(true);
	});
});
