export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(?<comment>.*)/gi;
export const SIGN_REGEX = /[><=!]+/;
export const SIGN_REGEX_SPACE = /[><=!]+(\S+)/;

export const SYMBOL_DICE = "&";

export const DETECT_CRITICAL = /\{\*?c[fs]:[<>=!]+(.+?)}/gim;
export const OPTIONAL_COMMENT = /\s+(#|\/{2}|\[|\/\*)?(?<comment>.*)/gi;
