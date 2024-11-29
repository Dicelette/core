# @Core

The core module for Dicelette, contains :
- The dice function (that parse the string into a Dice Parser and send the result in a good message) ;
- The verification of the template

The two are used in the bot and documentation.

# Type alias
- **Sign**: `"+" | "-" | "*" | "/" | "%" | "^" | "**";`
- **Statistic** : `{ [name: string]: { combination?: string; max?: number; min?: number; } }` :
  - **name**: `string` : The name of the statistic
  - **combination**: `string` : A combination between multiple/other statistic, formula... (ex: `constitution+2`). Can't coexist with min & max.
  - **max**: `number` : The maximum value of the statistic
  - **min**: `number` : The minimum value of the statistic

# Interface ([index.d.ts](@types/index.d.ts))
## Compare

- **sign**: ``"<"`` \| ``">"`` \| ``">="`` \| ``"<="`` \| ``"="`` \| ``"!="`` \| ``"=="``
- **value**: `number`

## Critical

- `Optional` **failure**: `number`
- `Optional` **success**: `number`

## Modifier

- **sign**: [Sign](#sign)
- **value**: `number`

## Resultat

- `Optional` **comment**: `string`
- `Optional` **compare**: [`Compare`](#compare)
- **dice**: `string`
- `Optional` **modifier**: [`Modifier`](#modifier)
- **result**: `string`

## Statistical Template
### Example

```ts
diceType: "1d20+{{$}}>=20"
```
The dice throw will be 1d20 + statistique that must be less than 20

```ts
diceType: "1d20<=$"
```
The dice throw will be 1d20 that must be less than the statistic

### Properties
- `Optional` **charName**: `boolean` 
Allow to force the user to choose a name for them characters

- `Optional` **critical**: [`Critical`](#critical)
How the success/echec will be done

- `Optional` **damage**: `{ [name: string]: string }`
Special dice for damage

- `Optional` **diceType**: `string`
A die type in the notation supported by the bot. [See documentation for syntaxe](https://dicelette.github.io/en/docs/model/register).

- `Optional` **statistics**: [`Statistic`](#statistic-type)

- `Optional` **total**: `number`
A total can be set, it allows to calculate the total value of a future register member
If the sum of the value > total, the bot will send a message to the user to inform him that the total is exceeded and an error will be thrown
Note: Statistic that have a formula will be ignored from the total

# Modules
## Dice

### Variables
- `const` **COMMENT_REGEX**: `RegExp`

### Functions
#### **calculator**(`sign`, `value`, `total`): `number`
Evaluate a formula and replace "^" by "**" if any

| Name | Type |
| :------ | :------ |
| `sign` | [`Sign`](#sign) |
| `value` | `number` |
| `total` | `number` |

#### **roll**(`dice`): [`Resultat`](#resultat) `| undefined`
Parse the string provided and turn it as a readable dice for dice parser

| Name | Type | Description |
| :------ | :------ | :------ |
| `dice` | `string` | {string} |


## Utils
### **cleanedDice**(`dice`): `string`

Replace the ++ +- -- by their proper value:
- `++` = `+`
- `+-` = `-`
- `--` = `+`

| Name | Type | Description |
| :------ | :------ | :------ |
| `dice` | `string` | {string} |

### **escapeRegex**(`string`): `string`
Escape regex string

| Name | Type | Description |
| :------ | :------ | :------ |
| `string` | `string` | {string} |

### **generateStatsDice**(`originalDice`, `stats?`): `string`

Replace the stat name by their value using stat and after evaluate any formula using `replaceFormulaInDice`

| Name | Type | Description |
| :------ | :------ | :------ |
| `originalDice` | `string` | {dice} |
| `stats?` | `Object` | {[name: string]: number} |

### **replaceFormulaInDice**(`dice`, `stats`): `string`

Replace the {{}} in the dice string and evaluate the interior if any

| Name | Type | Description |
| :------ | :------ | :------ |
| `dice` | `string` | {string} |


## Verify Template
### **diceRandomParse**(`value`, `template`): `string`

Generate a random dice and remove the formula (+ evaluate it)
Used for diceDamage only

| Name | Type | Description |
| :------ | :------ | :------ |
| `value` | `string` | {string} |
| `template` | [`StatisticalTemplate`](#statistical-template) | {StatisticalTemplate} |

### **diceTypeRandomParse**(`dice`, `template`): `string`
| Name | Type | Description |
| :------ | :------ | :------ |
| `dice` | `string` | {string} |
| `template` | [`StatisticalTemplate`](#statistical-template) | {StatisticalTemplate} |

### **evalCombination**(`combination`, `stats`): `Object`
Random the combination and evaluate it to check if everything is valid

| Name | Type | Description |
| :------ | :------ | :------ |
| `combination` | `Object` | {[name: string]: string} |
| `stats` | `Object` | {[name: string]: string\|number} |

### **evalOneCombination**(`combination`, `stats`): `any`

Evaluate one selected combination

| Name | Type | Description |
| :------ | :------ | :------ |
| `combination` | `string` | {string} |
| `stats` | `Object` | {[name: string]: string\|number} |

### **evalStatsDice**(`testDice`, `stats?`): `string`

Verify if the provided dice work with random value

| Name | Type | Description |
| :------ | :------ | :------ |
| `testDice` | `string` | {string} |
| `stats?` | `Object` | {[name: string]: number} |

### **generateRandomStat**(`total?`, `max?`, `min?`): `number`

| Name | Type | Default value |
| :------ | :------ | :------ |
| `total` | `undefined` \| `number` | `100` |
| `max?` | `number` | `undefined` |
| `min?` | `number` | `undefined` |

### **testCombination**(`template`): `void`

Test all combination with generated random value

| Name | Type |
| :------ | :------ |
| `template` | [`StatisticalTemplate`](#statistical-template) |

### **testDamageRoll**(`template`): `void`

Test each damage roll from the template.damage

| Name | Type |
| :------ | :------ |
| `template` | [`StatisticalTemplate`](#statistical-template) |

### **verifyTemplateValue**(`template`): [`StatisticalTemplate`](#statistical-template)

Parse the provided JSON and verify each field to check if everything could work when rolling

| Name | Type |
| :------ | :------ |
| `template` | `any` |
