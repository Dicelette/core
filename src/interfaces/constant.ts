export const COMMENT_REGEX = /\s+(#|\/{2}|\[|\/\*)(?<comment>.*)/;
export const SIGN_REGEX = /[><=!]+/;
export const SIGN_REGEX_SPACE = /[><=!]+(\S+)/;

export const SYMBOL_DICE = "&";

export const DETECT_CRITICAL = /\{c[fs]:[<>=!]+\d+}/gmi;