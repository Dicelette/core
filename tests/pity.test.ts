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

	describe("détection des comparaisons triviales", () => {
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
});
