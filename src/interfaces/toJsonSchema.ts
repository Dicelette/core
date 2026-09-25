import type { StatisticalTemplate } from "./index";

export interface StatisticalSchema extends StatisticalTemplate {
	/** Optional URL pointing to the schema definition. */
	$schema?: string;
}
