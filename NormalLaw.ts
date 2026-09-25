/** Rolls a dice many times and exports the result distribution to a CSV file. */

import { writeFileSync } from "node:fs";
import { type Resultat, roll } from "./src";

const args = process.argv.slice(2);
const diceExpr = args[0] || "1d20";
const totalIterations = 100_000;

const occurrences = new Map<number, number>();

for (let i = 0; i < totalIterations; i++) {
	const res: Resultat | undefined = roll(diceExpr);
	const total = res?.total;
	if (typeof total !== "number") continue;
	occurrences.set(total, (occurrences.get(total) ?? 0) + 1);
}

let csv = "valeur;occurences;pourcentage\n";
const sortedKeys = [...occurrences.keys()].sort((a, b) => a - b);
for (const key of sortedKeys) {
	const count = occurrences.get(key)!;
	const percent = ((count / totalIterations) * 100).toFixed(4).replace(".", ",");
	csv += `${key};${count};${percent}\n`;
}

const filename = `distribution_${diceExpr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
writeFileSync(filename, csv);
console.log(`✅ Generated csv file: ${filename}`);
