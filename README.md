# @Core

The core module for Dicelette — public API reference

This README documents the public API exported by the `core` package. It lists types, constants, functions and errors that are exported by the module (via `src/index.ts`).

## Overview

The `core` module provides small utilities to parse and evaluate dice notation, to generate and replace statistical values in dice expressions, and to validate statistical templates. The API is intended to be consumed by higher-level modules (bot, CLI, etc.).

## Pity System

The pity system is an optional feature that automatically re-rolls dice when a comparison fails, ensuring successful outcomes. This is useful in role-playing games where certain rolls must succeed (e.g., a critical save action).

### How It Works

When the `pity` parameter is set to `true` in the `roll()` function and the dice expression includes a comparison operator (e.g., `1d6>=5`), the system:

1. Evaluates the initial roll against the comparison condition
2. If the condition is **not met**, automatically re-rolls and repeats until success
3. Tracks the number of re-rolls in the `pityLogs` field of the result

### Limitations

The pity system only activates when a **comparison is theoretically possible**. For example:

- `1d6>=7` — **Ignored** (impossible: maximum roll is 6)
- `1d6>=5` — **Active** (possible: can roll 5 or 6)
- `2d6>=12` — **Active** (possible: can roll 12)
- `1d20>20` — **Ignored** (impossible: maximum roll is 20, not greater than 20)

### Example

```javascript
const result = roll("1d6>=5", null, true);
// If first roll is 3, pity system re-rolls
// If second roll is 2, pity system re-rolls again
// If third roll is 6, comparison succeeds and stops
// result.total = 6
// result.pityLogs = 2 (number of re-rolls)
```

Without pity (`pity = false` or `undefined`), a roll of `1d6>=5` would return the result regardless of comparison outcome, with no re-rolls.

### Usage Notes

- The pity system only applies when the roll includes a comparison operator
- The system has a safety limit of 100 re-rolls to prevent infinite loops
- The `pityLogs` field is only present in the result if at least one re-roll occurred
- Impossible comparisons are silently ignored (no error thrown)

## Public API

Note: when a parameter `engine` is shown it usually defaults to the `NumberGenerator.engines.nodeCrypto` engine (from `@dice-roller/rpg-dice-roller`) unless otherwise specified.

### Interfaces & Types (from `src/interfaces`)

#### Interface: Resultat
- dice: string — Original dice throw
- result: string — Formatted result from the dice roller
- comment?: string — Optional comment attached to the dice
- compare?: ComparedValue — Optional comparison attached to the roll
- modifier?: Modifier — Optional modifier applied to the roll
- total?: number — Optional numeric total of the roll
- pityLogs?: number — Optional count of re-rolls triggered by the pity system (see Pity System below)

#### Interface: Compare
- sign: "<" | ">" | ">=" | "<=" | "=" | "!=" | "=="
- value: number

#### Type: Sign
- `"+" | "-" | "*" | "/" | "%" | "^" | "**"` — Used for modifiers calculation

#### Type: ComparedValue
- `Compare & { originalDice?: string; rollValue?: string }` — Extends `Compare` with optional original dice and roll output when comparison uses a dice expression

#### Interface: Modifier
- sign?: Sign
- value: number

#### Type: Statistic
- Record<string, StatEntry> — map of statistic name to options (see `StatisticalTemplate`)

#### Interface: StatisticalTemplate
- charName?: boolean — force character name selection
- statistics?: Statistic — statistics available for a template
- total?: number — optional total for distribution checks
- forceDistrib?: boolean — force distribution
- diceType?: string — dice expression for rolls
- critical?: Critical — numerical critical settings
- customCritical?: CustomCriticalMap — map of custom critical rules
- damage?: Record<string, string> — named damage dice expressions

#### Interface: Critical
- success?: number
- failure?: number

#### Type: CustomCriticalMap
- `Record<string, CustomCritical>`

#### Interface: CustomCritical
- sign: "<" | ">" | "<=" | ">=" | "!=" | "=="
- value: string — can be a numeric string or a formula (may include `$` for statistic insertion)
- onNaturalDice?: boolean
- affectSkill?: boolean

### Constants (from `src/interfaces/constant.ts`)

#### Constant: COMMENT_REGEX
- RegExp — regex used to capture inline comments in a dice expression

#### Constant: SIGN_REGEX
- RegExp — regex matching comparison signs (`>`, `<`, `>=`, `<=`, `==`, `!=`, etc.)

#### Constant: SIGN_REGEX_SPACE
- RegExp — regex matching comparison sign and following token

#### Constant: SYMBOL_DICE
- string — symbol used to reference previous dice result inside shared rolls (value: `"&"`)

#### Constant: DETECT_CRITICAL
- RegExp — regex pattern used to detect inlined critical markers in dice type strings

### Utility functions (`src/utils.ts`)

#### Function: escapeRegex(string: string): string
- Escape input string to be used in a RegExp.

#### Function: standardizeDice(dice: string): string
- Standardizes dice notation while preserving bracketed text.

#### Function: generateStatsDice(originalDice: string, stats?: Record<string, number>, dollarValue?: string): string
- Replace statistic names with numeric values from `stats` and evaluate `{{ }}` formulas.
- If `dollarValue` is provided, all `$` placeholders are replaced by it before formula evaluation.

#### Function: replaceFormulaInDice(dice: string): string
- Finds `{{ ... }}` tokens in a dice string and evaluates their content using `mathjs`.
- Throws `FormulaError` on invalid expression.

#### Function: isNumber(value: unknown): boolean
- Returns `true` if `value` is a number or numeric string.

#### Function: replaceExpByRandom(dice: string, engine?: Engine | null): string
- Replaces `{exp}` placeholders by a random integer between 1 and 999 or a default value if provided (`{exp || 10}`). Uses `random-js` engine.

#### Function: randomInt(min: number, max: number, engine?: Engine | null): number
- Returns a random integer between `min` and `max` using `random-js` and the provided engine.

#### Function: getEngineId(engine: unknown): string
- Returns a human readable id for a `NumberGenerator` engine, e.g. `nodeCrypto`, `nativeMath`, `browserCrypto`, or fallbacks like constructor name.

#### Function: getEngine(engine: "nativeMath" | "browserCrypto" | "nodeCrypto"): Engine
- Returns the engine instance (from `NumberGenerator.engines`) matching the provided name.

### Similarity (`src/similarity.ts`)
#### Function: calculateSimilarity(str1: string, str2: string): number
- Calculate and return a similarity score between two strings using the levenshtein distance (value between 0 and 1).

#### Function: levenshteinDistance(str1: string, str2: string): number
- Calculate and return the Levenshtein distance between two strings.
- Used internally by `calculateSimilarity`.
- Returns an integer distance value.

#### Function : findBestStatMatch<T>(searchTerm: string, normalizedStat: Map<string, T>, similarityThreshold: number = 0.5, partialSearch: boolean = true): T | undefined`
- Find and return the best matching statistic from `normalizedStat` based on `searchTerm`.
- Normalized stat is a map of lowercased stat names to their original entries
- `partialSearch` allow to check if `normalizedStat` have a key that starts, ends or contains the `searchTerm` and return it directly.
- `similarityThreshold` is the minimum similarity score to consider a match. By default, it's set to 0.5.

#### Function: `findBestRecord(snippets: Record<string, string>, searchTerm: string, similarityThreshold: number = 0.5): string | undefined`
- Find and return the best matching string from `snippets` based on `searchTerm`.
- Just an alias for `findBestStatMatch` specialized for `Record<string, string>` and without partial search.

### Dice functions (`src/dice.ts`)

#### Function: roll(dice: string, engine?: Engine | null, pity?: boolean): Resultat | undefined
- Parse a dice notation string and perform the roll(s) using `rpg-dice-roller`.
- Supports comments, grouped/shared rolls, comparisons, modifiers and custom notation (see module docs).
- If `pity` is `true` and the roll includes a comparison (e.g., `1d6>=5`), automatically re-rolls until the comparison succeeds (see Pity System below).
- Returns `Resultat` when a dice expression is recognized, otherwise `undefined`.
- Throws `DiceTypeError` when the expression cannot be parsed or rolled.

#### Function: calculator(sign: Sign, value: number, total: number): number
- Evaluate a simple binary operation between `total` and `value` using the `sign` (supports `^` which is normalized to `**`). Uses `mathjs` to compute.

#### Function: createCriticalCustom(dice: string, customCritical: CustomCritical, template: StatisticalTemplate, engine?: Engine | null): string
- Create and return a dice expression where the template's `$` placeholders and formulas are evaluated for a custom critical rule.
- Throws `DiceTypeError` if the generated comparison contains `$` (not resolved) or if underlying dice parsing fails.

### Template verification (`src/verify_template.ts`)

#### Function: evalStatsDice(testDice: string, allStats?: Record<string, number>, engine?: Engine | null): string
- Replace statistic names in `testDice` with provided `allStats`, evaluate formulas / `{exp}` and verify the expression can be rolled.
- Returns the original `testDice` if validation passes, otherwise throws `DiceTypeError`.

#### Function: diceRandomParse(value: string, template: StatisticalTemplate, engine?: Engine | null): string
- For a damage dice expression (or similar), randomly choose a statistic value from `template.statistics` and replace statistic names, then evaluate `{{ }}` formulas.

#### Function: diceTypeRandomParse(dice: string, template: StatisticalTemplate, engine?: Engine | null): string
- For a `diceType` expression, picks one statistic (non-combination) from `template.statistics`, generates a random value and replaces `$` placeholders. Also replaces `{exp}` placeholders.

#### Function: evalCombinaison(combinaison: Record<string,string>, stats: Record<string, number | string>): Record<string, number>
- For each entry in `combinaison`, replace referenced stats and evaluate the formula to produce numeric values.
- Throws `FormulaError` on invalid formula.

#### Function: evalOneCombinaison(combinaison: string, stats: Record<string, number | string>): any
- Replace stats in the single `combinaison` string and evaluate; returns the evaluation result or throws `FormulaError`.

#### Function: verifyTemplateValue(template: unknown, verify?: boolean, engine?: Engine | null): StatisticalTemplate
- Parse and validate a raw template object using Zod `templateSchema`. Convert some fields (like critical success/failure) to numbers.
- If `verify` is true it runs extra verification (rolls `diceType` expressions, tests custom criticals, registered damages and stat combinations) and throws domain errors if invalid.
- Returns a typed `StatisticalTemplate` on success.

#### Function: testDiceRegistered(template: StatisticalTemplate, engine?: Engine | null): void
- Validate `template.damage` entries by generating random dice and attempting to roll them. Throws `DiceTypeError` or domain errors for invalid entries.

#### Function: testStatCombinaison(template: StatisticalTemplate, engine?: Engine | null): void
- Validates `statistics` that are combination formulas (`combinaison`) by generating random backing stats and evaluating each formula.

#### Function: generateRandomStat(total?: number, max?: number, min?: number, engine?: Engine | null): number
- Generate a single random statistic value honoring optional `min` / `max` and `total` constraints; repeats until a valid value is found.

### Errors (from `src/errors.ts`)

#### Error class: DiceTypeError
- extends `Error`
- Properties: `dice: string`, `cause?: string`, `method?: unknown`
- Thrown when a dice expression cannot be parsed or rolled; used widely across the module.

#### Error class: FormulaError
- extends `Error`
- Properties: `formula: string`, `cause?: string`, `method?: unknown`
- Thrown when a formula (e.g. inside `{{ }}` or a combinaison) cannot be evaluated.

#### Error class: MaxGreater
- extends `Error`
- Properties: `name: string`, `value: number`, `max: number`
- Thrown by schema refinement when `max` <= `min`.

#### Error class: EmptyObjectError
- extends `Error` — Thrown when an object expected to be non-empty is empty.

#### Error class: TooManyDice
- extends `Error` — Thrown when too many damage dice entries are present.

#### Error class: TooManyStats
- extends `Error` — Thrown when too many statistics are provided.

#### Error class: NoStatisticsError
- extends `Error` — Thrown when combinaison validation requires base statistics but none are present.

### Zod Schema (from `src/interfaces/zod.ts`)

#### Export: templateSchema
- Zod schema for `StatisticalTemplate` JSON: `charName`, `statistics`, `total`, `forceDistrib`, `diceType`, `critical`, `customCritical`, `damage`.
- Use `templateSchema.parse(obj)` to validate raw JSON and obtain transformed values.

### Usage notes

- Most functions accept an optional `engine` parameter to control random number generation. The engine values correspond to `NumberGenerator.engines` from `@dice-roller/rpg-dice-roller` (e.g. `nodeCrypto`, `nativeMath`, `browserCrypto`). Use `getEngine("nodeCrypto")` to obtain the engine instance.

- Errors thrown by this module are typed (see the `Errors` section). Catch and inspect the thrown error to determine the failure reason.

- For working examples, see the test cases in the `tests/` directory of the package.