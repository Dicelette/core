export interface Resultat {
	dice: string;
	result: string;
	comment?: string;
	compare?: Compare | undefined;
	modifier?: Modifier;
}

export interface Compare {
	sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "==";
	value: number;
}

export type Sign = "+" | "-" | "*" | "/" | "%" | "^" | "**";

export interface Modifier {
	sign?: Sign;
	value: number;
}

export type Statistic = {
	[name: string]: {
		max?: number;
		min?: number;
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
	/** Special dice for damage */
	damage?: {
		[name: string]: string;
	};
}

export interface Critical {
	success?: number;
	failure?: number;
}
