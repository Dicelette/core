export class DiceTypeError extends Error {
	public readonly dice: string;
	public readonly cause: string | undefined;
	public readonly method: unknown;

	constructor(dice: string, cause?: string, method?: unknown) {
		super(dice);
		this.name = "Invalid_Dice_Type";
		this.dice = dice;
		this.cause = cause;
		this.method = method;
	}
}

export class FormulaError extends Error {
	public readonly formula: string;
	public readonly cause: string | undefined;
	public readonly method: unknown;

	constructor(formula: string, cause?: string, method?: unknown) {
		super(formula);
		this.name = "Invalid_Formula";
		this.formula = formula;
		this.cause = cause;
		this.method = method;
	}
}

export class MaxGreater extends Error {
	public readonly name: string;
	public readonly value: number;
	public readonly max: number;

	constructor(value: number, max: number) {
		super(value.toString());
		this.name = "Max_Greater";
		this.value = value;
		this.max = max;
	}
}

export class EmptyObjectError extends Error {
	public readonly name: string;

	constructor() {
		super();
		this.name = "Empty_Object";
	}
}

export class TooManyDice extends Error {
	public readonly name: string;

	constructor() {
		super();
		this.name = "Too_Many_Dice";
	}
}

export class NoStatisticsError extends Error {
	public readonly name: string;

	constructor() {
		super();
		this.name = "No_Statistics";
	}
}
