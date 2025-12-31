import { evaluate } from "mathjs";
import type { Sign } from "../interfaces";

/**
 * Evaluate a formula and replace "^" by "**" if any
 * @param {Sign} sign
 * @param {number} value
 * @param {number} total
 * @returns
 */
export function calculator(sign: Sign, value: number, total: number): number {
	if (sign === "^") sign = "**";
	return evaluate(`${total} ${sign} ${value}`);
}
