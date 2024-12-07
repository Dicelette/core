import type { StatisticalTemplate } from "./index";

export interface StatisticalSchema extends StatisticalTemplate {
	/**
	 * Specifies the URL for the schema definition
	 * This property is optional and should contain a valid URI.
	 */
	$schema?: string;
}
