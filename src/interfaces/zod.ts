/**
 * Definition of the Zod schema for template data
 */
import { z } from "zod";

const statisticValueSchema = z
	.object({
		max: z.number().positive().optional(),
		min: z.number().positive().optional(),
		combinaison: z
			.string()
			.transform((str) => str.trim() || undefined)
			.optional(),
	})
	.superRefine((data, ctx) => {
		if (data.max !== undefined && data.min !== undefined && data.max <= data.min) {
			ctx.addIssue({
				code: "custom",
				message: `Max_Greater; ${data.min}; ${data.max}`,
				path: ["max"],
			});
		}
	});

const statisticSchema = z
	.record(statisticValueSchema)
	.optional()
	.refine((stats) => !stats || Object.keys(stats).length <= 25, {
		message: "TooManyStats",
	});

const criticalSchema = z.object({
	success: z.number().positive().optional(),
	failure: z.number().positive().optional(),
});

const damageSchema = z
	.record(z.string())
	.optional()
	.refine((stats) => !stats || Object.keys(stats).length <= 25, {
		message: "TooManyDice",
	});

export const templateSchema = z.object({
	charName: z.boolean().optional(),
	statistics: statisticSchema,
	total: z.number().positive().optional(),
	diceType: z.string().optional(),
	critical: criticalSchema.optional(),
	damage: damageSchema,
});

export type StatisticalTemplateFromSchema = z.infer<typeof templateSchema>;
