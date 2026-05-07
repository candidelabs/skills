---
name: forwarding-address
description: Use when integrating Candide's Forwarding Address API for cross-chain deposit address routing — generating deterministic deposit addresses, activating relayer monitoring, querying per-bridge minimum amounts, or estimating fees via JSON-RPC. Triggers on mentions of forwarding address, cross-chain deposit, deterministic address, custodialWithdrawer, or deposit routing.
---

# Forwarding Address Integration Skill

You are integrating the Forwarding Address API: a JSON-RPC service that generates deterministic deposit addresses for asset routing. Users send tokens to a forwarding address on any supported chain (including the destination chain itself), and the tokens are automatically routed to the recipient's wallet on the destination chain.

## Documentation

The API changes frequently. Always read the live docs for exact parameters, response schemas, and examples. Check the changelog first to see what changed recently.

- **Changelog** (recent breaking changes and additions): https://docs.candide.dev/account-abstraction/research/forwarding-address-api#changelog
- **API Reference** (parameters, response schemas, examples): https://docs.candide.dev/account-abstraction/research/forwarding-address-api
- **Integration Guide** (patterns, TTL management, gotchas): https://docs.candide.dev/account-abstraction/research/forwarding-address-guide
- **Recovery frontend** (for stuck funds): https://forwarding-address.candidelabs.com/

## Phase 1: Understand the Integration

Before writing any code, ask the developer:

1. **What are you building?** (wallet, exchange, payment app, bot, other)
2. **Tech stack?** (TypeScript/Node.js, Python, Go, etc.)
3. **Does your company have a secure wallet that can serve as a recovery safety net?** This wallet becomes the `custodialWithdrawer`: a company-controlled address that can recover stuck funds on behalf of users. See the "Company Recovery Wallet" section below.
4. **One destination chain or multichain?** If the app has one main destination chain, default all forwarding addresses to it. If users pick their destination chain, the integration needs a chain selector backed by `forwarding_getRoutes`.
5. **One address per user, or one per transaction?** Determines whether to use the `salt` parameter.
6. **Long-lived or short-lived addresses?** Long-lived addresses need a TTL check before each use to re-activate if expired.

Do not proceed until you have clear answers. These choices shape the entire integration.

## Phase 2: Plan the Integration

Based on their answers, propose an approach before writing code. Cover:

- Where the API calls happen (backend service, frontend, serverless function)
- How forwarding addresses are generated and stored
- Whether `destinationChainId` is fixed or user-selected
- TTL handling: re-activate on demand when the address is needed
- How deposit arrival is detected (polling recipient balance on destination chain)
- Error handling and edge cases

Get the developer's approval before proceeding to implementation.

## Phase 3: Implement

Read the API Reference for full parameter details before writing code: https://docs.candide.dev/account-abstraction/research/forwarding-address-api

Follow this implementation order:

1. Set up the JSON-RPC client (see Protocol section below)
2. Query `forwarding_getRoutes` (once per source chain) to discover supported routes and tokens
3. Implement address generation (`forwarding_getAddress` + `account_activateForwardingAddress`)
   - The activation call requires `Authorization: Bearer <account_api_key>` (admin-issued by Candide). Other methods are public.
4. Add user-input validation with `forwarding_getMinimumAmount` before any fee estimation
5. Add fee estimation if needed (`forwarding_estimateOutput`)
6. Add TTL check: re-activate if expired before presenting the address to the user
7. Add deposit arrival detection (poll recipient balance on destination chain)

---

## API Methods

### Protocol

JSON-RPC 2.0 over HTTP POST. Parameters are a single object inside a one-element array.

```
POST {FORWARDING_API_URL}
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "<method>",
  "params": [{ <params_object> }]
}
```

Successful responses have a `result` field. Errors have an `error` field with a `message` string.

### Method Summary

For full parameter tables and response schemas, see the [API Reference](https://docs.candide.dev/account-abstraction/research/forwarding-address-api).

- **`forwarding_getRoutes`**: Returns all routes from a given source chain with accepted tokens and fees. Takes a required `sourceChainId`. Call once per source chain to build the full picture of supported destinations and tokens. Single source of truth for what is supported.
- **`forwarding_getMinimumAmount`**: Returns per-bridge minimum deposit amounts for a given source chain, destination chain, and token. Call this before `forwarding_estimateOutput` to validate user input. Minimums are bridge-specific and can change.
- **`forwarding_getAddress`**: Computes a deterministic deposit address from `recipient`, `custodialWithdrawer`, `destinationChainId`, and optional `salt`. Pure computation, no side effects. Same inputs always return the same address.
- **`account_activateForwardingAddress`**: Starts relayer monitoring on the specified source chains with a TTL. The destination chain is automatically included for same-chain forwarding. Idempotent: calling again resets the TTL. Required before deposits will be forwarded. Requires `Authorization: Bearer <account_api_key>` (admin-issued). Each account can have up to 500 active forwarding addresses; refreshing an existing one does not count against the cap (error `-32013` if exceeded).
- **`forwarding_getActivation`**: Checks whether the relayer is monitoring a forwarding address. Tracks activation status only, not deposit completion.
- **`forwarding_estimateOutput`**: Estimates what the recipient receives after relayer and bridge protocol fees for a given route, token, and amount. Returns the selected `bridge` alongside the output amount. Does not require an activated address. Same-chain forwards return `relayerBotFee: "0"`.

---

## Company Recovery Wallet (`custodialWithdrawer`)

**Set `custodialWithdrawer` to your company's secure wallet address.** This is a safety net: if funds get stuck in a forwarding address, the company can recover them on behalf of users.

Every forwarding address has two parties that can withdraw from the deployed contract on the source chain:

- The **recipient** can always withdraw immediately
- The **`custodialWithdrawer`** (company's secure wallet) can withdraw after a timelock period

Why this matters: if a user sends funds to the forwarding address from an exchange or any wallet they do not control on the source chain, and those funds get stuck, the user cannot send a withdrawal transaction on that chain. Without a separate `custodialWithdrawer`, those funds are permanently unrecoverable.

| Scenario | `custodialWithdrawer` | Outcome |
|---|---|---|
| Wallet or dapp (recommended) | Company's secure wallet | Company can recover stuck funds after timelock. User can always withdraw immediately |
| Fully self-managed | Same as `recipient` | Only the user can recover. If they cannot transact on the source chain, funds are lost |
| Custodial (exchanges, neobanks) | Company's secure wallet | Company recovers on behalf of user after timelock |

When the developer says "non-custodial", still recommend setting `custodialWithdrawer` to the company's secure wallet. Explain the exchange funding risk. Only set it to `recipient` if the developer explicitly understands and accepts the tradeoff.

If funds need to be recovered, direct users to the recovery frontend: https://forwarding-address.candidelabs.com/

---

## Hard Rules

Do not skip these.

1. Always call `forwarding_getRoutes` before any other call to verify the route exists. Never assume chain IDs, tokens, or fees.
2. Never suggest sending unsupported tokens. Only tokens from the route's `tokens` array will be forwarded. Anything else gets stuck.
3. Never suggest sending below the bridge minimum. Call `forwarding_getMinimumAmount` for the exact source chain, destination chain, and token; a deposit below every bridge's `minAmount` will not be forwarded. Convert `minAmount` to human-readable using the source token's `decimals` when presenting to users.
4. The forwarding address accepts deposits on any supported chain, including the destination chain itself. Check `forwarding_getRoutes` to confirm which chains are supported for a given route.
5. Activation is required. An address that is not activated (or has expired) will not have deposits forwarded. Always activate after computing the address.
6. The activation call (`account_activateForwardingAddress`) requires `Authorization: Bearer <account_api_key>` — get one from Candide. Other methods are public. Never embed this key in client-side code (browser, mobile, or any user-distributed binary). Call activation from a backend you control and expose a thin endpoint to your client.
7. There is no webhook for deposit completion. `forwarding_getActivation` checks if monitoring is active, not if a deposit was forwarded. To confirm arrival, poll the recipient's balance on the destination chain. Typical latency is 10 to 20 seconds.
8. Amounts are always in smallest unit. 1 ETH = `"1000000000000000000"` (18 decimals). 1 USDT = `"1000000"` (6 decimals). Use the token's `decimals` field for conversion.

## Common Mistakes

- **Hardcoding chain IDs or token addresses.** Routes change. Always read them from `forwarding_getRoutes`.
- **Forgetting to activate.** Computing an address with `forwarding_getAddress` does not start monitoring. You must call `account_activateForwardingAddress` (with the bearer account API key) or deposits will not be forwarded.
- **Confusing `forwarding_getActivation` with deposit tracking.** It only checks whether the relayer is monitoring, not whether a deposit arrived. Poll the recipient's balance on the destination chain instead.
- **Setting `custodialWithdrawer` to the user's address in a non-custodial app.** If the user funded from an exchange, they cannot recover stuck funds. Use the company's secure wallet.
- **Ignoring TTL expiration.** Before presenting a forwarding address, check activation status and call `account_activateForwardingAddress` again if the TTL has expired.
- **Embedding the account API key in client-side code.** Mobile and web clients can be decompiled or inspected. The bearer key must live on a server you control; clients call your backend, your backend calls `account_activateForwardingAddress`.

## Validation Rules

Apply before making API calls:

1. Addresses must match `^0x[0-9a-fA-F]{40}$`
2. Chain IDs must appear in `forwarding_getRoutes` results. Do not guess or hardcode.
3. Token addresses must come from the route's `tokens` array for the chosen source-to-destination pair.
4. Amounts must be decimal strings in smallest unit (no floating point). Must be greater than or equal to the bridge minimum returned by `forwarding_getMinimumAmount` for the same source chain, destination chain, and token.
5. `custodialWithdrawer` should be the company's secure wallet for most integrations.
6. `salt`: only use if the developer needs multiple addresses for the same recipient + destination.
7. The account API key must be loaded from a server-side secret store (env var, secrets manager). Never bundle it into client builds, commit it, or pass it through to the browser/mobile app.
