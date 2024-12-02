import { expect, it } from "bun:test";
import {
	type CustomCritical,
	type StatisticalTemplate,
	createCriticalCustom,
} from "../src";

it("should return a custom critical dice", () => {
	const customCritical: CustomCritical = {
		sign: ">",
		value: "{{round($/2)}}",
	};
	const template: StatisticalTemplate = {
		statistics: { stat1: { max: 10, min: 10 } },
		diceType: "1d20+{{ceil(($-10)/2)}}>20",
		damage: {
			piercing: "1d6+2",
		},
		customCritical: {
			hardSuccess: customCritical,
		},
	};
	const result = createCriticalCustom("1d20=20", customCritical, template);
	const expected = "1d20>5";
	expect(result).toEqual(expected);
});

it("should validate even if the stats are used multiple time", () => {
	const customCritical: CustomCritical = {
		sign: ">",
		value: "{{round($/2)}}",
	};
	const template: StatisticalTemplate = {
		statistics: { stat1: { max: 10, min: 10 } },
		diceType: "1d20+{{ceil(($-10)/2)}}>20",
		damage: {
			piercing: "1d6+2",
		},
		customCritical: {
			hardSuccess: customCritical,
		},
	};
	const result = createCriticalCustom(
		"1d20+{{ceil(($-10)/2)}}>20",
		customCritical,
		template
	);
	const expected = "1d20+0>5";
	expect(result).toEqual(expected);
});
