/** biome-ignore-all lint/style/useNamingConvention: <explanation> */
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

export const MIN_THRESHOLD_MATCH = 0.5;
export const REMOVER_PATTERN = {
	ASTERISK_ESCAPE: /\*/g,
	CRITICAL_BLOCK: /\{\*?c[fs]:([<>=]|!=)+.+?\}/gim,
	EXP_REMOVER: /\{exp(.*?)\}/g,
	SIGN_REMOVER: /([><=]|!=)+.*$/,
	STAT_COMMENTS_REMOVER: /%%.*%%/,
	STAT_MATCHER: /\(?\$([\p{L}\p{M}_.][\p{L}\p{M}0-9_.]*)\)?/giu,
} as const;
export const DETECT_CRITICAL_ALL = /(\{\*?c[fs]:)((?:[<>=]|!=)+)(.+?)\}$/i;
