export interface Resultat {
	/**
	 * Original dice throw
	 */
	dice: string;
	/**
	 * Result of the dice throw
	 */
	result: string;
	/**
	 * The comment that was added to the dice throw (if any)
	 */
	comment?: string;
	/**
	 * The comparison made on the dice
	 */
	compare?: ComparedValue;
	/**
	 * If any value was added to the dice throw
	 */
	modifier?: Modifier;
	/**
	 * Total of the roll
	 */
	total?: number;
}


export interface Compare {
	/**
	 * Sign of the comparison
	 */
	sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "==";
	/**
	 * Value of the comparison
	 */
	value: number;
}

/**
 * Sign format for calculation of modifier
 */
export type Sign = "+" | "-" | "*" | "/" | "%" | "^" | "**";

export type ComparedValue = Compare & {
	/**
	 * Original dice if the comparaison is made with a dice throw
	 */
	originalDice?: string;
	/**
	 * Output of the dice throw
	 */
	rollValue?: string;
};

export interface Modifier {
	/**
	 * Sign of the modifier
	 */
	sign?: Sign;
	/**
	 * Value of the modifier
	 * @TJS-type integer
	 */
	value: number;
}

/**
 * Statistic object template
 */
export type Statistic = Record<
	/**
	 * The name of the statistic
	 * @TJS-type string
	 */
	string, StatEntry
>;
	
	type StatEntry = {
		/**
		 * The value of the statistic that can take the stats
		 * @TJS-type integer
		 */
		max?: number;
		/**
		 * The minimal value of the statistic that can take the stats
		 * @TJS-type integer
		 */
		min?: number;
		/**
		 * The combinaison that can be made with ANOTHER statistic
		 * Automatically disable the max/min value
		 */
		combinaison?: string;
		/**
		 * Allow to exclude from roll selection in /dbroll!
		 */
		exclude?: boolean;
	}

/**
 * @example
 * diceType: 1d20+$>=20
 * The dice throw will be 1d20 + statistique that must be >= 20
 * @example
 * diceType: 1d20<=$
 * The dice throw will be 1d20 that must be <= statistique
 */
export interface StatisticalTemplate {
	/** Allow to force the user to choose a name for them characters */
	charName?: boolean;
	/**
	 * The statistics that can be used in the dice throw
	 * @maximum 25
	 */
	statistics?: Statistic;
	/**
	 * A total can be set, it allows to calculate the total value of a future register member
	 * If the sum of the value > total, the bot will send a message to the user to inform him that the total is exceeded and an error will be thrown
	 * @note statistique that have a formula will be ignored from the total
	 * @TJS-type integer
	 */
	total?: number;
	
	/**
	 * Force the distribition of all the points
	 */
	forceDistrib?: boolean;
	/** A dice type in the notation supported by the bot */
	diceType?: string;
	/**
	 * How the success/echec will be done
	 */
	critical?: Critical;
	/**
	 * Custom critical, allow to adjust the critical on a statistic, and set multiple critical value
	 * @maximum 22
	 */
	customCritical?: CustomCriticalMap

	/** Special dice for damage
	 * @maximum 25
	 * */
	damage?: Record<string, string>;
}
export type CustomCriticalMap = Record<string, CustomCritical>;

/**
 * If the result can be considered as a critical
 * Critical is compared to the "natural" dice result, so any modifier doesn't count
 */
export interface Critical {
	/**
	 * The value that will be considered as a success
	 * Can only be compared strictly with the natural dice result
	 * @TJS-type integer
	 */
	success?: number;
	/**
	 * The value that will be considered as a failure.
	 * Can only be compared strictly with the natural dice result
	 * @TJS-type integer
	 */
	failure?: number;
}

export interface CustomCritical {
	/**
	 * Sign of the comparison
	 */
	sign: "<" | ">" | "<=" | ">=" | "!=" | "==";
	/**
	 * Can be a simple value, or a formula, including the statistics with $
	 * @example round($/2)
	 */
	value: string;
	/**
	 * If "true", the comparison will be made on the natural dice result, without any modifier, including the statistics bonus if any.
	 */
	onNaturalDice?: boolean;
	/**
	 * Allow to use the custom critical on dbD command (damage)
	 * @default false
	 */
	affectSkill?: boolean;
}
