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
	compare?: Compare | undefined;
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

export interface Modifier {
	/**
	 * Sign of the modifier
	 */
	sign?: Sign;
	/**
	 * Value of the modifier
	 */
	value: number;
}

/**
 * Statistic object template
 */
export type Statistic = {
	[name: string]: {
		/**
		 * The value of the statistic that can take the stats
		 */
		max?: number;
		/**
		 * The minimal value of the statistic that can take the stats
		 */
		min?: number;
		/**
		 * The combinaison that can be made with ANOTHER statistic
		 * Automatically disable the max/min value
		 */
		combinaison?: string;
	};
};

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
	statistics?: Statistic;
	/**
	 * A total can be set, it allows to calculate the total value of a future register member
	 * If the sum of the value > total, the bot will send a message to the user to inform him that the total is exceeded and an error will be thrown
	 * @note statistique that have a formula will be ignored from the total
	 */
	total?: number;
	/** A dice type in the notation supported by the bot */
	diceType?: string;
	/**
	 * How the success/echec will be done
	 */
	critical?: Critical;
	/**
	 * Custom critical, allow to adjust the critical on a statistic, and set multiple critical value
	 */
	customCritical?: {
		[name: string]: {
			sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "==";
			value: string;
		};
	};
	/** Special dice for damage */
	damage?: {
		[name: string]: string;
	};
}

/**
 * If the result can be considered as a critical
 * Critical is compared to the "natural" dice result, so any modifier doesn't count
 */
export interface Critical {
	/**
	 * The value that will be considered as a success
	 */
	success?: number;
	/**
	 * The value that will be considered as a failure
	 */
	failure?: number;
}
