import { SIGN_REGEX } from "./interfaces/constant";

/**
 * Get or create a cached regex pattern
 */
const regexCache = new Map<string, RegExp>();
export const NORMALIZE_SINGLE_DICE = (str: string) => str.replace(/\b1d(\d+)/gi, "d$1");
export const REMOVER_PATTERN = {
	ASTERISK_ESCAPE: /\*/g,
	CRITICAL_BLOCK: /\{\*?c[fs]:([<>=]|!=)+.+?\}/gim,
	EXP_REMOVER: /\{exp(.*?)\}/g,
	SIGN_REMOVER: /([><=]|!=)+.*$/,
	STAT_COMMENTS_REMOVER: /%%.*%%/,
	STAT_MATCHER: /\(?\$([\p{L}\p{M}_.][\p{L}\p{M}0-9_.]*)\)?/giu,
} as const;

export function getCachedRegex(pattern: string, flags = ""): RegExp {
	const key = `${pattern}|${flags}`;
	let regex = regexCache.get(key);
	if (!regex) {
		regex = new RegExp(pattern, flags);
		regexCache.set(key, regex);
	}
	return regex;
}
export function includeDiceType(dice: string, diceType?: string, userStats?: boolean) {
	if (!diceType) return false;
	// Normalize leading implicit single dice: treat `1d100` and `d100` as equivalent
	diceType = NORMALIZE_SINGLE_DICE(diceType);
	dice = NORMALIZE_SINGLE_DICE(dice);
	if (userStats && diceType.includes("$")) {
		//replace the $ in the diceType by a regex (like .+?)
		diceType = diceType.replace("$", ".+?");
	}
	if (SIGN_REGEX.test(diceType)) {
		//remove it from the diceType and the value after it like >=10 or <= 5 to prevent errors
		diceType = diceType.replace(REMOVER_PATTERN.SIGN_REMOVER, "").trim();
		dice = dice.replace(REMOVER_PATTERN.SIGN_REMOVER, "").trim();
	}
	//also prevent error with the {exp} value
	if (diceType.includes("{exp")) {
		diceType = diceType.replace(REMOVER_PATTERN.EXP_REMOVER, "").trim();
		dice = dice.replace(REMOVER_PATTERN.EXP_REMOVER, "").trim();
	}
	const detectDiceType = getCachedRegex(`\\b${diceType}\\b`, "i");
	return detectDiceType.test(dice);
}
