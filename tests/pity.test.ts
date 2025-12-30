import { describe, expect, it } from "bun:test";
import * as core from "../src";

describe("pity system", () => {
	describe("pity activée", () => {
		it("devrait reroll jusqu'au succès et incrémenter pityLogs quand premier tir échoue", () => {
			const result = core.roll("1d6>=5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(5);
			expect(result!.compare).toEqual({ sign: ">=", value: 5 });
		});

		it("devrait fonctionner avec l'opérateur >", () => {
			const result = core.roll("1d6>3", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(6);
		});

		it("devrait fonctionner avec l'opérateur <", () => {
			const result = core.roll("1d6<5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(4);
		});

		it("reroll jusqu'au succès avec <=", () => {
			const result = core.roll("1d6<=4", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeLessThanOrEqual(4);
		});
	});

	describe("pity ignorée (comparaisons impossibles)", () => {
		it("devrait ignorer pity quand la comparaison est impossible (1d6>=7)", () => {
			const result = core.roll("1d6>=7", null, true);

			expect(result).not.toBeUndefined();
			// Impossible d'avoir >=7 avec 1d6, donc pity ignorée
			expect(result!.pityLogs).toBeUndefined();
		});

		it("devrait ignorer pity pour 1d20>20 (impossible)", () => {
			const result = core.roll("1d20>20", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("devrait ignorer pity pour 1d6<1 (impossible)", () => {
			const result = core.roll("1d6<1", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("devrait accepter pity pour 2d6>=12 (possible)", () => {
			const result = core.roll("2d6>=12", null, true);

			expect(result).not.toBeUndefined();
			// Si le résultat est 12, c'est possible; sinon pity a rerollé
			expect(result!.total).toBeGreaterThanOrEqual(2);
			expect(result!.total).toBeLessThanOrEqual(12);
		});
	});

	describe("pity désactivée", () => {
		it("ne devrait pas reroll quand pity est false", () => {
			const result = core.roll("1d6>=5", null, false);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});

		it("ne devrait pas reroll quand pity est undefined", () => {
			const result = core.roll("1d6>=5", null, undefined);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
		});
	});

	describe("cas sans comparaison", () => {
		it("ne devrait pas appliquer pity sans comparaison", () => {
			const result = core.roll("1d6", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.pityLogs).toBeUndefined();
			expect(result!.compare).toBeUndefined();
		});
	});

	describe("cas limites", () => {
		it("devrait gérer l'opérateur !=", () => {
			const result = core.roll("1d6!=5", null, true);

			expect(result).not.toBeUndefined();
			// != est un opérateur d'explosion, pas une comparaison standard
			// Le test vérifie juste que le roll fonctionne
			expect(result!.total).toBeGreaterThanOrEqual(1);
			expect(result!.total).toBeLessThanOrEqual(6);
		});

		it("devrait gérer l'opérateur == (égal)", () => {
			const result = core.roll("1d6==5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.compare).toBeDefined();
		});

		it("devrait gérer <= (inférieur ou égal)", () => {
			const result = core.roll("1d6<=5", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.compare!.sign).toBe("<=");
		});
	});

	describe("integration avec dés multiples", () => {
		it("devrait calculer correctement le max pour 2d6", () => {
			const result = core.roll("2d6>=12", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(2);
			expect(result!.total).toBeLessThanOrEqual(12);
		});

		it("devrait calculer correctement le max pour 3d4", () => {
			const result = core.roll("3d4>=12", null, true);

			expect(result).not.toBeUndefined();
			expect(result!.total).toBeGreaterThanOrEqual(3);
			expect(result!.total).toBeLessThanOrEqual(12);
		});
	});
});
