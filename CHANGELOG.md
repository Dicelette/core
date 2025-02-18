# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.12.3](https://github.com/Dicelette/core/compare/v1.12.2...v1.12.3) (2025-02-18)

## [1.12.2](https://github.com/Dicelette/core/compare/v1.12.1...v1.12.2) (2025-02-12)


### Bug Fixes

* **dice:** remove leading '+' from dice string in roll function ([9e2aee9](https://github.com/Dicelette/core/commit/9e2aee9e70283e1fe0d6bca41a97120e917911d8))
* **utils:** rename variable for clarity in replaceFormulaInDice function ([40b619b](https://github.com/Dicelette/core/commit/40b619bc03f9405aa119612b7a4e0448512b43ee))

## [1.12.1](https://github.com/Dicelette/core/compare/v1.12.0...v1.12.1) (2025-02-11)


### Bug Fixes

* **dice:** use {exp} to prevent colliding with {{exp}} stats name ([05fab86](https://github.com/Dicelette/core/commit/05fab86ed7d8e6a89f434bbf23b2c76ff95b158a))

## [1.12.0](https://github.com/Dicelette/core/compare/v1.11.7...v1.12.0) (2025-02-11)


### Features

* **verify:template:** replace {{exp}} placeholder with default value in dice evaluation ([6e33ab3](https://github.com/Dicelette/core/commit/6e33ab3acce0c96f801c850b9d7906c688a77c93))

## [1.11.7](https://github.com/Dicelette/core/compare/v1.11.6...v1.11.7) (2025-02-09)


### Bug Fixes

* **sharedRoll:** comments with parenthesis collide with hidden main dice ([db82c33](https://github.com/Dicelette/core/commit/db82c33789374148bc3105acb2fc7af603c27879))

## [1.11.6](https://github.com/Dicelette/core/compare/v1.11.5...v1.11.6) (2025-02-09)


### Bug Fixes

* **sharedRoll:** comments for roll shouldn't be used as global command ([e65fbab](https://github.com/Dicelette/core/commit/e65fbab04c8c1f255a6ce5b1732b9ecbaaa07634))

## [1.11.5](https://github.com/Dicelette/core/compare/v1.11.4...v1.11.5) (2024-12-31)


### Bug Fixes

* **utils:** should standardize dice when using generateStats ([3a56ec8](https://github.com/Dicelette/core/commit/3a56ec804d73e25527d488eba7b1b67a3e8044f7))

## [1.11.4](https://github.com/Dicelette/core/compare/v1.11.3...v1.11.4) (2024-12-21)


### Bug Fixes

* **sharedRoll:** add a specific icon for the dice main, allowing a better replacement for the success text ([2763c5a](https://github.com/Dicelette/core/commit/2763c5aa727f6fa987cfa6524253320ab94499b7))

## [1.11.3](https://github.com/Dicelette/core/compare/v1.11.2...v1.11.3) (2024-12-21)

## [1.11.2](https://github.com/Dicelette/core/compare/v1.11.1...v1.11.2) (2024-12-21)


### Bug Fixes

* **utils:** improve stat replacement ([b00563c](https://github.com/Dicelette/core/commit/b00563c97e95ae525ffaec6167fbeb35bf9979a2))

## [1.11.1](https://github.com/Dicelette/core/compare/v1.11.0...v1.11.1) (2024-12-20)


### Bug Fixes

* **sharedRoll:** allow comparison with non & roll ([d3845d6](https://github.com/Dicelette/core/commit/d3845d67e5f152a01a5461a45e6ad14b845f248d))

## [1.11.0](https://github.com/Dicelette/core/compare/v1.10.1...v1.11.0) (2024-12-20)


### Features

* **sharedRoll:** allow comment per roll ([6d5965b](https://github.com/Dicelette/core/commit/6d5965bed0efa31592334348b3267a1b33c95ad0))


### Bug Fixes

* **roll:** use named group for comments ([040f7f9](https://github.com/Dicelette/core/commit/040f7f9985da21f33c791ba001489271d541697d))

## [1.10.1](https://github.com/Dicelette/core/compare/v1.10.0...v1.10.1) (2024-12-20)


### Bug Fixes

* allow multiple dice with ; without needing & ([3a136ea](https://github.com/Dicelette/core/commit/3a136ea175d8ab1d22c350f4e8d25f94fdc843f1))

## [1.10.0](https://github.com/Dicelette/core/compare/v1.9.1...v1.10.0) (2024-12-20)


### Features

* **sharedRoll:** allow to hide the main dice in sharedRoll (using parenthesis) ([e162b94](https://github.com/Dicelette/core/commit/e162b94385ecb95a2ddb6256c575b9ca6de20139))

## [1.9.1](https://github.com/Dicelette/core/compare/v1.9.0...v1.9.1) (2024-12-13)

## [1.9.0](https://github.com/Dicelette/core/compare/v1.8.7...v1.9.0) (2024-12-13)


### Features

* **interfaces:** add optional exclude field to schema ([df6d0a1](https://github.com/Dicelette/core/commit/df6d0a1cacec2bcee1bb8375e97a98232b9bb2ec))
* **utils:** add dollarValue parameter to generateStatsDice function ([e17e528](https://github.com/Dicelette/core/commit/e17e528e18cc6146c8dc69f8442d2e93b13ba492))

## [1.8.7](https://github.com/Dicelette/core/compare/v1.8.6...v1.8.7) (2024-12-12)


### Bug Fixes

* **dice:** handle non-dice throw evaluation in parseDice function ([2eb2846](https://github.com/Dicelette/core/commit/2eb2846bf9129feec58904bf8d861053fe2e8277))

## [1.8.6](https://github.com/Dicelette/core/compare/v1.8.5...v1.8.6) (2024-12-12)

## [1.8.5](https://github.com/Dicelette/core/compare/v1.8.4...v1.8.5) (2024-12-11)

## [1.8.4](https://github.com/Dicelette/core/compare/v1.8.3...v1.8.4) (2024-12-11)


### Bug Fixes

* **custom-critical:** forgot to  update zod to add "affectSkill" boolean ([023535d](https://github.com/Dicelette/core/commit/023535d804d78c9a06d742d16ed3cde5022d65fa))

## [1.8.3](https://github.com/Dicelette/core/compare/v1.8.2...v1.8.3) (2024-12-11)

## [1.8.2](https://github.com/Dicelette/core/compare/v1.8.1...v1.8.2) (2024-12-11)

## [1.8.1](https://github.com/Dicelette/core/compare/v1.8.0...v1.8.1) (2024-12-10)

## [1.8.0](https://github.com/Dicelette/core/compare/v1.7.0...v1.8.0) (2024-12-10)


### Features

* add affectSkill option to custom critical on dbD command ([39d6fa8](https://github.com/Dicelette/core/commit/39d6fa8b28f84fda172b423e2e49f889b627ef6e))

## [1.7.0](https://github.com/Dicelette/core/compare/v1.6.0...v1.7.0) (2024-12-09)


### Features

* **dice:** enhance dice comparison with roll detail ([d9ec47e](https://github.com/Dicelette/core/commit/d9ec47ef113f900ae4a5f1d0cdbe4ade68c364ec))

## [1.6.1](https://github.com/Dicelette/core/compare/v1.6.0...v1.6.1) (2024-12-08)

## [1.6.0](https://github.com/Dicelette/core/compare/v1.5.2...v1.6.0) (2024-12-07)


### Features

* add schema for people that use the template in VSCode ([bedfe4a](https://github.com/Dicelette/core/commit/bedfe4a57242cc65076cada0cddd855b93eb5ced))
* **custom-critical:** introduce custom critical value in template. ([d57d968](https://github.com/Dicelette/core/commit/d57d96861d92a81cb096b73f4473ad0718c2c147))

## [1.5.2](https://github.com/Dicelette/core/compare/v1.5.1...v1.5.2) (2024-12-06)


### Bug Fixes

* **standardize:** multiple formula not parsed correctly ([8253bed](https://github.com/Dicelette/core/commit/8253bed46e1273187a1483b5d67a6ca44bcb22e7))

## [1.5.1](https://github.com/Dicelette/core/compare/v1.5.0...v1.5.1) (2024-12-01)


### Bug Fixes

* multiple formula not parsed correctly ([d28eaca](https://github.com/Dicelette/core/commit/d28eaca96d934f31e8fdeb4336f0146bc6e92d1f))

## [1.5.0](https://github.com/Dicelette/core/compare/v1.4.7...v1.5.0) (2024-12-01)


### Features

* parse the template using zod ([69bdd3b](https://github.com/Dicelette/core/commit/69bdd3bfb1caa29211dbd7117a4b088f7ca23fe3))

## [1.4.7](https://github.com/Dicelette/core/compare/v1.4.6...v1.4.7) (2024-12-01)


### Bug Fixes

* prevent 0 when generating a random stats ([c858d8f](https://github.com/Dicelette/core/commit/c858d8f9489fd63e5f9aa203ad95784fc99d2421))

## [1.4.6](https://github.com/Dicelette/core/compare/v1.4.5...v1.4.6) (2024-11-30)


### Bug Fixes

* **evalStatsDice:** only kept the last value when multiple stats are used in skill ([6bc4776](https://github.com/Dicelette/core/commit/6bc4776296934fe264aa85b861300c75a0ec3e76))

## [1.4.5](https://github.com/Dicelette/core/compare/v1.4.4...v1.4.5) (2024-11-30)


### Bug Fixes

* in some condition, doesn't found the max/min of a stat ([4119a35](https://github.com/Dicelette/core/commit/4119a35dbe84804197a4b83a4f6601758b778b9f))
* rolling 0 if no min is set ([68c5857](https://github.com/Dicelette/core/commit/68c58570babcbc83b5774accf25fdbcc91e0a461))
* **standardize:** standardize issue when parsing dice skill ([a84613a](https://github.com/Dicelette/core/commit/a84613aa5ae46f133e9e8d0b22116169b0009eb6))
* when doing roll with some replacement, trimEnd() to prevent error during roll. ([bc169c6](https://github.com/Dicelette/core/commit/bc169c6d4ec61bcf689aa1ffbcb00c578346657f))

## [1.4.4](https://github.com/Dicelette/core/compare/v1.4.3...v1.4.4) (2024-11-29)


### Bug Fixes

* switch to uniformize lib ([43e5884](https://github.com/Dicelette/core/commit/43e58840a7bd90e52281d6268f67542e637b7ec2))

## [2.0.0](https://github.com/Dicelette/core/compare/v1.4.3...v2.0.0) (2024-11-29)


### ⚠ BREAKING CHANGES

* Fix typo in combinaison ⇒ combinaison

### Bug Fixes

* switch to uniformize lib ([51852e4](https://github.com/Dicelette/core/commit/51852e428f0ff518141dea6ba8ee2ab4f6583514))

## [1.4.3](https://github.com/Dicelette/core/compare/v1.4.2...v1.4.3) (2024-10-26)

## [1.4.2](https://github.com/Dicelette/core/compare/v1.4.1...v1.4.2) (2024-10-25)


### Bug Fixes

* typo in dice ([8b4dc00](https://github.com/Dicelette/core/commit/8b4dc00717c9b6ea0c2689b29c144642738ba7c3))

## [1.4.1](https://github.com/Dicelette/core/compare/v1.4.0...v1.4.1) (2024-10-25)

## [1.4.0](https://github.com/Dicelette/core/compare/v1.2.1...v1.4.0) (2024-10-25)


### Features

* allow minimal multiple dice with keeping the roll with syntax "dice;formula1;formula2..." ([811889a](https://github.com/Dicelette/core/commit/811889a15b961d34debe3e58d2d7c226c3e719fa))
* allow to compare value in the dices formulae ([8e23478](https://github.com/Dicelette/core/commit/8e23478492879600f4e01fff7f4ba771c92033c3))
* allow to use dice in ; formula ([3c86f88](https://github.com/Dicelette/core/commit/3c86f88baf71fd3194b893b7648cd1e609f60b2d))

## [1.2.1](https://github.com/Dicelette/core/compare/v1.2.0...v1.2.1) (2024-06-17)

## 1.2.0 (2024-06-17)


### Features

* export error for ts type ([873c2f1](https://github.com/Dicelette/core/commit/873c2f172527d9d6b1f527e1fc87bb3e6c17ecf8))


### Bug Fixes

* add custom error for better reading in bot/doc ([e97397b](https://github.com/Dicelette/core/commit/e97397b2ed847536ef34b744f199fec69c455856))
* forgot to verify if a diceTYpe is valid ([ed91a3c](https://github.com/Dicelette/core/commit/ed91a3cf70fd89b5109c0a0082af70abf3b033ab))
