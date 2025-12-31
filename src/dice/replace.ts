import { COMMENT_REGEX, SYMBOL_DICE } from "../interfaces/constant";

export function replaceUnwantedText(dice: string) {
	return dice.replaceAll(/[{}]/g, "").replaceAll(/s[ad]/gi, "");
}

export function fixParenthesis(dice: string) {
	//dice with like 1d(20) are not valid, we need to remove the parenthesis
	//warning: the 1d(20+5) is valid and should not be changed
	const parenthesisRegex = /d\((\d+)\)/g;
	return dice.replaceAll(parenthesisRegex, (_match, p1) => `d${p1}`);
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
	const commentsRegex = /\[(?<comments>.*?)\]/;
	const commentsMatch = commentsRegex.exec(dice);
	const comments = commentsMatch?.groups?.comments
		? `${commentsMatch.groups.comments}`
		: "";

	// Search for optional comments (# or // style) only AFTER removing bracket comments
	// to avoid conflicts with parentheses inside bracket comments
	const diceWithoutBrackets = dice.replace(commentsRegex, "");
	const optionalCommentsRegex = /\s+(#|\/\/)(?<comment>.*)/;
	const optionalComments = optionalCommentsRegex.exec(diceWithoutBrackets);
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
