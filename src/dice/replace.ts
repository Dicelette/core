import { SortOrder } from "../interfaces";
import { COMMENT_REGEX, SYMBOL_DICE } from "../interfaces/constant";

const PARENTHESIS_REGEX = /d\((\d+)\)/g;
const BRACKET_COMMENT_REGEX = /\[(?<comments>.*?)\]/;
const OPTIONAL_COMMENT_REGEX = /\s+(#|\/\/)(?<comment>.*)/;

export function replaceUnwantedText(dice: string, sortOrder?: SortOrder) {
	const d = dice.replaceAll(/[{}]/g, "").replaceAll(/s[ad]/gi, "");
	if (sortOrder) return sortDice(d, sortOrder);
	return d;
}

/**
 * Sort the output of the dice
 * Split by ;
 * Then sort each part based on the total `= Y`
 * @param dice
 * @param sortOrder
 */
function sortDice(dice: string, sortOrder: SortOrder) {
	if (sortOrder === SortOrder.None) return dice;
	const dices = dice.split(/; ?/);
	// Pre-parse totals once; avoids parseInt inside the O(n log n) comparator
	const decorated = dices.map((d) => ({
		d,
		v: Number.parseInt(d.split("= ")[1], 10) || 0,
	}));
	if (sortOrder === SortOrder.Ascending) {
		decorated.sort((a, b) => b.v - a.v);
	} else if (sortOrder === SortOrder.Descending) {
		decorated.sort((a, b) => a.v - b.v);
	}
	return decorated.map((x) => x.d).join("; ");
}

export function fixParenthesis(dice: string) {
	//dice with like 1d(20) are not valid, we need to remove the parenthesis
	//warning: the 1d(20+5) is valid and should not be changed
	return dice.replaceAll(PARENTHESIS_REGEX, (_match, p1) => `d${p1}`);
}

export function replaceText(element: string, total: number, dice: string) {
	return {
		formule: element.replace(SYMBOL_DICE, `[${total}]`).replace(/%.*%/g, "").trim(),
		diceAll: element
			.replace(SYMBOL_DICE, `[${dice.replace(COMMENT_REGEX, "")}]`)
			.replace(/%.*%/g, "")
			.trim(),
	};
}

export function formatComment(dice: string) {
	const commentsMatch = BRACKET_COMMENT_REGEX.exec(dice);
	const comments = commentsMatch?.groups?.comments
		? `${commentsMatch.groups.comments}`
		: "";

	// Search for optional comments (# or // style) only AFTER removing bracket comments
	// to avoid conflicts with parentheses inside bracket comments
	const diceWithoutBrackets = dice.replace(BRACKET_COMMENT_REGEX, "");
	const optionalComments = OPTIONAL_COMMENT_REGEX.exec(diceWithoutBrackets);
	const optional = optionalComments?.groups?.comment
		? `${optionalComments.groups.comment.trim()}`
		: "";

	//fusion of both comments with a space if both exists
	//result expected = "__comment1 comment2__ — "
	//or "__comment1__ — " or "__comment2__ — "
	let finalComment = "";
	if (comments && optional) finalComment = `__${comments} ${optional}__ — `;
	else if (comments) finalComment = `__${comments}__ — `;
	else if (optional) finalComment = `__${optional}__ — `;
	return finalComment;
}
