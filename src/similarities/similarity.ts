/** String similarity and distance utilities. */
import { DiceTypeError } from "../errors";
import { MIN_THRESHOLD_MATCH, REMOVER_PATTERN } from "../interfaces";

/**
 * Calculates the similarity between two strings as a value between 0 and 1.
 */
export function calculateSimilarity(str1: string, str2: string): number {
	const longer = str1.length > str2.length ? str1 : str2;
	const shorter = str1.length > str2.length ? str2 : str1;
	if (longer.length === 0) return 1.0;
	const distance = levenshteinDistance(longer, shorter);
	return (longer.length - distance) / longer.length;
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Uses two rolling rows instead of a full matrix: O(min(m,n)) space instead of O(m×n).
 */
export function levenshteinDistance(str1: string, str2: string): number {
	if (str1.length > str2.length) {
		[str1, str2] = [str2, str1];
	}
	let prev = Array.from({ length: str1.length + 1 }, (_, i) => i);
	let curr = new Array<number>(str1.length + 1);
	for (let j = 1; j <= str2.length; j++) {
		curr[0] = j;
		for (let i = 1; i <= str1.length; i++) {
			const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
			curr[i] = Math.min(
				curr[i - 1] + 1, // insertion
				prev[i] + 1, // deletion
				prev[i - 1] + cost // substitution
			);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[str1.length];
}

/** Finds the best-matching stat for a token among the normalized stats. */
export function findBestStatMatch<T>(
	searchTerm: string,
	normalizedStats: Map<string, T>,
	similarityThreshold = MIN_THRESHOLD_MATCH
): T | undefined {
	// Exact match
	const exact = normalizedStats.get(searchTerm);
	if (exact) return exact;

	// Partial match: prefix match, then pick the most similar
	const candidates: Array<[T, number]> = [];
	for (const [normalizedKey, original] of normalizedStats) {
		if (normalizedKey.startsWith(searchTerm))
			candidates.push([original, calculateSimilarity(searchTerm, normalizedKey)]);
	}
	if (candidates.length === 1) return candidates[0][0];
	if (candidates.length > 0) {
		candidates.sort((a, b) => b[1] - a[1]);
		if (candidates[0][1] >= similarityThreshold) return candidates[0][0];
	}

	// Fallback: similarity search if no partial match was found
	let bestMatch: T | undefined;
	let bestSimilarity = 0;
	for (const [normalizedKey, original] of normalizedStats) {
		const similarity = calculateSimilarity(searchTerm, normalizedKey);
		if (similarity === 1) return original;
		if (similarity > bestSimilarity && similarity >= similarityThreshold) {
			bestSimilarity = similarity;
			bestMatch = original;
		}
	}
	return bestMatch;
}

/** Finds the record key with the highest similarity to `searchTerm`, or null if below `similarityThreshold`. */
export function findBestRecord(
	record: Record<string, string>,
	searchTerm: string,
	similarityThreshold = MIN_THRESHOLD_MATCH
): string | null {
	const normalizeRecord: Map<string, string> = new Map();
	for (const key of Object.keys(record)) {
		normalizeRecord.set(key.standardize(), key);
	}

	return (
		findBestStatMatch<string>(
			searchTerm.standardize(),
			normalizeRecord,
			similarityThreshold
		) || null
	);
}

export function replaceUnknown(dice: string, replacer: string) {
	return dice
		.replace(REMOVER_PATTERN.STAT_MATCHER, (match) => {
			const hasOpen = match.startsWith("(");
			const hasClose = match.endsWith(")");
			if (hasOpen && hasClose) return replacer;
			if (hasOpen) return `(${replacer}`;
			if (hasClose) return `${replacer})`;
			return replacer;
		})
		.replaceAll("+0", "")
		.replaceAll("-0", "");
}

/**
 * Stateless copy of `STAT_MATCHER`: testing the shared global instance would advance its
 * `lastIndex` and cause the next roll's `matchAll` to silently skip a leading `$stat`.
 */
const STAT_MATCHER_TEST = new RegExp(REMOVER_PATTERN.STAT_MATCHER.source, "iu");

export function verifyStatMatcherPattern(dice: string, replaceUnknow?: string) {
	if (STAT_MATCHER_TEST.test(dice)) {
		if (replaceUnknow)
			// Remove all unresolved stat references
			return replaceUnknown(dice, replaceUnknow);

		// Collect the stat names that weren't resolved, for the error message
		const matched = dice.matchAll(new RegExp(REMOVER_PATTERN.STAT_MATCHER));
		const stats = matched
			? Array.from(matched, (m) => m?.[0])
					.map((s) => `\`${s}\``)
					.join(", ")
			: "unknown";
		throw new DiceTypeError(stats, "unknown_stats");
	}
	return dice.replaceAll("+0", "").replaceAll("-0", "");
}
