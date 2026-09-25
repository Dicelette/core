import { evaluate } from "mathjs";
import type { Sign } from "../interfaces";

/** Evaluates `total <sign> value`, converting `^` to `**` for mathjs. */
export function calculator(sign: Sign, value: number, total: number): number {
	if (sign === "^") sign = "**";
	return evaluate(`${total} ${sign} ${value}`);
}
