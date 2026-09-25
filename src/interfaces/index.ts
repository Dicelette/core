export interface Resultat {
	/** Original dice throw. */
	dice: string;
	/** Result of the dice throw. */
	result: string;
	/** Comment attached to the dice throw, if any. */
	comment?: string;
	/** Comparison made on the dice. */
	compare?: ComparedValue;
	/** Modifier added to the dice throw, if any. */
	modifier?: Modifier;
	/** Total of the roll. */
	total?: number;
	pityLogs?: number;
	trivial?: boolean;
}

export interface Compare {
	/** Sign of the comparison. */
	sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "==";
	/** Value of the comparison. */
	value: number;
	/** True if the comparison is always true or always false. */
	trivial?: boolean;
}

/** Sign used for modifier calculations. */
export type Sign = "+" | "-" | "*" | "/" | "%" | "^" | "**";

export type ComparedValue = Compare & {
	/** Original dice if the comparison is made against a dice throw. */
	originalDice?: string;
	/** Output of that dice throw. */
	rollValue?: string;
};

export interface Modifier {
	/** Sign of the modifier. */
	sign?: Sign;
	/**
	 * Value of the modifier
	 * @TJS-type integer
	 */
	value: number;
}

/** Statistic object template. */
export type Statistic = Record<
	/**
	 * The name of the statistic
	 * @TJS-type string
	 */
	string,
	StatEntry
>;

type StatEntry = {
	/**
	 * Maximum value the statistic can take
	 * @TJS-type integer
	 */
	max?: number;
	/**
	 * Minimum value the statistic can take
	 * @TJS-type integer
	 */
	min?: number;
	/** Formula combining this statistic with another; disables max/min when set. */
	combinaison?: string;
	/** Excludes this statistic from roll selection in /dbroll. */
	exclude?: boolean;
};

/**
 * @example diceType: "1d20+$>=20" → rolls 1d20 + the stat, must be >= 20
 * @example diceType: "1d20<=$" → rolls 1d20, must be <= the stat
 */
export interface StatisticalTemplate {
	/** Forces the user to choose a name for their character. */
	charName?: boolean;
	/**
	 * The statistics that can be used in the dice throw
	 * @maximum 25
	 */
	statistics?: Statistic;
	/**
	 * A total can be set to cap the sum of all statistic values; exceeding it throws an error
	 * @note Statistics using a formula are excluded from the total
	 * @TJS-type integer
	 */
	total?: number;

	/** Forces the distribution of all the points. */
	forceDistrib?: boolean;
	/** A dice type in the notation supported by the bot */
	diceType?: string;
	/** How success/failure is determined. */
	critical?: Critical;
	/**
	 * Adjusts the critical for a specific statistic; supports multiple custom criticals
	 * @maximum 22
	 */
	customCritical?: CustomCriticalMap;

	/**
	 * Special dice for damage
	 * @maximum 25
	 */
	damage?: Record<string, string>;
}
export type CustomCriticalMap = Record<string, CustomCritical>;

/** Whether the result counts as a critical, compared against the natural (unmodified) dice result. */
export interface Critical {
	/**
	 * Value considered a success; compared strictly against the natural dice result
	 * @TJS-type integer
	 */
	success?: number;
	/**
	 * Value considered a failure; compared strictly against the natural dice result
	 * @TJS-type integer
	 */
	failure?: number;
}

export interface CustomCritical {
	/** Sign of the comparison. */
	sign: "<" | ">" | "<=" | ">=" | "!=" | "==";
	/**
	 * Can be a simple value, or a formula, including the statistics with $
	 * @example round($/2)
	 */
	value: string;
	/** If true, compares against the natural dice result only, ignoring modifiers and stat bonuses. */
	onNaturalDice?: boolean;
	/**
	 * Enables this custom critical for the damage command (dbD)
	 * @default false
	 */
	affectSkill?: boolean;
}

export enum SortOrder {
	Ascending = "sa",
	Descending = "sd",
	None = "none",
}
export * from "./constant";
