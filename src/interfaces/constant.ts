export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(?<comment>.*)/gi;
// Match comparison operators but exclude explosive dice (!>, !<, !<=, !>=)
// Accept != as a valid comparison, but not !> or !< (which are explosive dice)
// Use negative lookbehind to check for ![<>] before any comparison operator
export const SIGN_REGEX =
	/==|!=|(?<![!<>])>=|(?<![!<>])<=|(?<!!)(?<![<>])>|(?<!!)(?<![<>])<|(?<!!)(?<![<>])=/;
export const SIGN_REGEX_SPACE =
	/(==|!=|(?<![!<>])>=|(?<![!<>])<=|(?<!!)(?<![<>])>|(?<!!)(?<![<>])<|(?<!!)(?<![<>])=)(\S+)/;

export const SYMBOL_DICE = "&";

export const DETECT_CRITICAL = /\{\*?c[fs]:([<>=]|!=)+(.+?)}/gim;
export const OPTIONAL_COMMENT = /\s+(#|\/{2}|\[|\/\*)?(?<comment>.*)/gi;

/** Strip comparison operators and everything after them (e.g. `>=10` → ``) */
export const SIGN_REMOVER = /([><=]|!=)+.*$/;
/** Strip `{exp...}` placeholders from a dice string */
export const EXP_REMOVER = /\{exp(.*?)\}/g;
/** Normalize implicit leading `1d` — treat `1d100` and `d100` as equivalent */
export const NORMALIZE_SINGLE_DICE = (str: string) => str.replace(/\b1d(\d+)/gi, "d$1");
