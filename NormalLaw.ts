/**
 * After a pretty strange interaction on Discord, I needed to know if my roll function follow the normal law.
 * So huh.
 * I will write a function that iterates 10_000 times and export an CSV to be able to check it in Excel.
 */

import { writeFileSync } from "fs";
import { roll, type Resultat } from "./src";

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

// Génération du CSV
let csv = "valeur;occurences;pourcentage\n";
const sortedKeys = [...occurrences.keys()].sort((a, b) => a - b);
for (const key of sortedKeys) {
	const count = occurrences.get(key)!;
	const percent = (count / totalIterations * 100).toFixed(4).replace(".", ",");
	csv += `${key};${count};${percent}\n`;
}


const filename = `distribution_${diceExpr.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
writeFileSync(filename, csv);
console.log(`✅ Generated csv file: ${filename}`);