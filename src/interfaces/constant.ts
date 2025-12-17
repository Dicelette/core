export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(?<comment>.*)/gi;
// Match comparison operators but exclude explosive dice (!>, !<, !<=, !>=)
// Accept != as a valid comparison, but not !> or !< (which are explosive dice)
// Use negative lookbehind to check for ![<>] before any comparison operator
export const SIGN_REGEX = /!=|(?<![!<>])>=|(?<![!<>])<=|(?<!!)(?<![<>])>|(?<!!)(?<![<>])<|(?<!!)(?<![<>])=/;
export const SIGN_REGEX_SPACE = /(!=|(?<![!<>])>=|(?<![!<>])<=|(?<!!)(?<![<>])>|(?<!!)(?<![<>])<|(?<!!)(?<![<>])=)(\S+)/;

export const SYMBOL_DICE = "&";

export const DETECT_CRITICAL = /\{\*?c[fs]:([<>=]|!=)+(.+?)}/gim;
export const OPTIONAL_COMMENT = /\s+(#|\/{2}|\[|\/\*)?(?<comment>.*)/gi;
