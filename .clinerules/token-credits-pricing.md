# Token, Credits, and Pricing Logic

This document explains the logic used by LibreChat to calculate token usage, credit costs, and their relationship to USD pricing.

## 1. Core Concepts

- **Tokens**: The basic unit of text processing for AI models (roughly 4 characters for English).
- **Credits**: The internal currency used to manage user balances within LibreChat.
- **USD Pricing**: The real-world cost charged by AI providers (OpenAI, Anthropic, etc.).

## 2. Conversion Logic

LibreChat uses a standardized conversion factor between USD and internal credits:

> **$1.00 USD = 1,000 Credits**

This means:
- 1 Credit = $0.001 USD
- 10 Credits = $0.01 USD
- 100 Credits = $0.10 USD

## 3. Model Rates (`api/models/tx.js`)

Pricing for each model is defined in `api/models/tx.js`. The values listed (multipliers) represent the **cost in USD per 1,000 tokens**.

Because of the 1,000 credits per $1 conversion, the multiplier value in the codebase conveniently serves a dual purpose:
1. **USD Cost per 1,000 tokens**.
2. **Credit Cost per 1 token**.

### Example: GPT-4o-mini
- **Prompt Rate (multiplier)**: `0.00015`
- **Completion Rate (multiplier)**: `0.0006`

For a usage of 1,000 prompt tokens:
- **USD Cost**: `(1,000 / 1,000) * 0.00015 = $0.00015`
- **Credit Cost**: `1,000 * 0.00015 = 0.15 Credits`

## 4. Implementation Logic

### 4.1 Token Spending (`api/models/spendTokens.js`)
The entry point for accounting. It receives token usage from the AI provider and triggers transactions.

### 4.2 Transaction Calculation (`api/models/Transaction.js`)
The `calculateTokenValue` function calculates the final credit amount:
- `Credit Cost = Token Count * Multiplier`

### 4.3 Special Rules
- **Incomplete Completions**: If a request is cancelled or incomplete, a `cancelRate` (default 1.15) is applied to the completion cost.
- **Prompt Caching**: For models supporting caching (e.g., Claude, DeepSeek), specific `write` and `read` multipliers from `cacheTokenValues` are used.

## 5. Summary Formulae

- **Total Credits Spent** = `(Prompt Tokens * Prompt Multiplier) + (Completion Tokens * Completion Multiplier)`
- **Total USD Equivalent** = `Total Credits Spent / 1,000`

## 6. Administrative Tools

- **`config/export-costs.js`**: Aggregates transactions and converts credits back to USD for reporting (`cost = credits / 1000`).
- **`config/add-balance.js`**: Used to top up user credits.
- **`config/set-balance.js`**: Used to precisely set a user's credit balance.

## 7. Purchasing Credits

- **Add Credits UI**: Users can purchase credits via the "My Account" interface.
- **Conversion**: When purchasing, the system applies the standard rate: **1 USD = 1,000 Credits**.
- **Backend**: The `/balance/credits` endpoint handles the transaction creation and balance update.
