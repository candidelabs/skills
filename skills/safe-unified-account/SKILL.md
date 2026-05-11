---
name: safe-unified-account
description: Use when integrating Candide's Safe Unified Account or `abstractionkit` for multichain smart accounts across EVM chains, including unified balance / cross-chain transfer flows over USDC or USDT. Triggers on Safe Unified Account, multichain smart account, chain abstraction, abstractionkit, multichain UserOperation, single-signature multichain execution, unified balance UX, cross-chain transfer, Across bridge integration, or SpokePool depositV3.
---

# Safe Unified Account — Best Practices

One smart account, deterministic address across every EVM chain, single signature executes on N chains. This skill is judgment for integration. SDK shapes, method signatures, and concrete code live in the docs and the example repo — fetch them when you write code.

## Source priority

1. **Docs** — https://docs.candide.dev/wallet/guides/chain-abstraction-overview/ — authoritative for SDK version, supported chains, endpoints, method names
2. **Examples** — https://github.com/candidelabs/abstractionkit-examples/tree/main/chain-abstraction — minimal, copy-pasteable scripts for the multichain flow (ECDSA and passkey variants)
3. **Reference demo (unified balance + bridge)** — https://github.com/candidelabs/safe-unified-account-demo — full React app demonstrating one viable shape of the integration. Read it as an example, not as a template. The skill's job is to surface the decisions a developer must make; their answers will shape the integration differently.

Do not invent SDK calls. If a method or parameter is not in the docs or examples, fetch them before guessing.

## Discover before you code

Ask the developer all four before producing any plan or code. None are optional — the shape of the integration changes with each.

1. **What are they integrating?** Signer management, guardians for social recovery, value movement (transfers, swaps), unified balance UX, or arbitrary multichain MetaTransactions. The orchestrator pattern is the same; the UX surface and risk model are not.
2. **Signer type.** ECDSA private keys (simpler) or passkeys (WebAuthn P-256, hands off to the passkey skill for credential creation and signing).
3. **Paymaster.** App-sponsored gas, ERC-20 token paymaster, or self-funded. Decision applies to every chain.
4. **Target chains.** Validate against the docs' supported list. If unsure, suggest two Sepolia-family testnets — zero signup. Distinguish the two chain roles below.

## Two chain models to surface

- **Account chains** — chains where the Safe runs UserOperations. Need bundler, paymaster, and a separate JSON-RPC. At least two for the multichain story to mean anything. Funds held here can be moved by the Safe directly.
- **Destination-only chains** — outbound payout targets. The Safe itself never operates here, but the user sends *out of* their Safe to recipients on these chains via a bridge fill. Useful when the Safe lives on Optimism and Arbitrum and the user needs to pay an address on Ethereum mainnet.

Surface this distinction; do not flatten "chains" into a single list. The endpoint requirements differ too — destination-only chains need only an RPC (for recipient balance reads and bridge-fill polling), no bundler or paymaster.

## Three endpoints per chain — the most common mistake

Each account chain needs **three separate URLs**:

1. **Bundler** (Candide) — exposes ERC-4337 bundler methods (`eth_sendUserOperation`, `eth_estimateUserOperationGas`, `eth_getUserOperationReceipt`, etc.)
2. **Paymaster** (Candide) — exposes paymaster methods for gas sponsorship or token payment
3. **Execution-client RPC** — exposes standard methods (`eth_call`, `eth_getBalance`, `eth_getTransactionCount`, `eth_gasPrice`, etc.) for reading account state, nonces, balances, gas prices. Use publicnode, drpc, Infura, Alchemy, or similar.

All three are JSON-RPC endpoints — the distinction is the *method set* each implements. Candide's public endpoint serves bundler and paymaster methods; it does not serve execution-client methods, so a separate RPC is required for state reads.

## Unified balance is two separate problems

Surface both to the developer; they are routinely conflated.

- **Display side.** "One USDC balance" means summing per-chain ERC-20 balances client-side. Always offer a per-chain breakdown on demand — users need to know where their funds physically live.
- **Spending side.** Sending more on a destination than the Safe holds there requires a **bridge**. The SDK does not bridge for you. The developer chooses: Across, CCTP, LayerZero, Hop, Stargate, and others — each with different tradeoffs around speed, fees, supported tokens, finality, and trust assumptions. Surface the choice; do not pick for them. If they're unsure, name the candidates and the axes (speed, fees, token support, trust model) so they can decide.

The mechanical pattern, regardless of bridge: encode the bridge's deposit call as a MetaTransaction on the source chain, track the destination fill independently, gross-up the input so the recipient lands a clean amount.

## Bridge integration — properties to enforce

Whatever bridge the developer picks, their integration must have these properties. Surface as principles; the implementation is theirs.

- **Display balance tolerates a dead RPC.** Read per-chain balances with a settle-each-independently primitive — a failing RPC degrades that chain to zero, not the whole total. Always preserve a per-chain breakdown.
- **User enters the recipient's amount, not the sender's.** Bridge fees are charged on input; the spender thinks in output. Splitting logic grosses input up from a target output using fresh bridge quotes. Asking the user to math fees is a UX failure.
- **Prefer local before bridging.** If the destination is also an account chain, consume its local balance first — a direct `transfer()` is cheaper and faster. Bridge only the residual.
- **The split must be explainable.** Whatever weighting the developer picks (largest-balance-first, lowest-fee-first, fixed priority), the user sees which chains contributed and how much. Keep it deterministic so the signed preview matches execution.
- **Fees can make a split infeasible — handle it.** A chain may have enough for the leg but not for leg-plus-fees. Either redistribute to a chain with headroom or fail with a clear "insufficient unified balance after fees". Redistribution must terminate — bound it.
- **Quotes are time-bounded.** Quotes carry freshness windows (timestamps, fill deadlines). If user signing is slow (passkey, hardware wallet), re-quote before submitting; never sign against a stale quote.
- **Bridge status is independent from UserOp status.** A successful source UserOp means the deposit landed, not that the recipient was paid. Track and surface bridge fill per leg, alongside per-chain UserOp status. "Sent" is not "delivered."

These are bridge-shape-agnostic — they apply to Across, CCTP, LayerZero, Hop, Stargate alike. The specific endpoints, call shapes, and event names live in each bridge's docs.

## USDC and USDT — token-shape decisions to surface

The above assumes one canonical token per chain. Make the developer confront these before writing config:

- **USDC** — 6 decimals on every supported chain. Two flavors exist in the wild: native USDC (issued by Circle) and bridged USDC (`USDC.e`, etc.). They are not the same ERC-20. Make the developer pick one flavor per chain and verify the bridge actually routes between the chosen pair — a mismatched route will fail to quote or land on the wrong asset.
- **USDT** — 6 decimals on most chains, **but 18 on BSC**. Decimals must be per-chain, not a global constant. Have the developer source them from the token contract at config time rather than hardcoding.

Surface the flavor and per-chain decimals choices in Phase 1 discovery. They are silent footguns if assumed.

## No cross-chain atomicity — design for it

The single most-violated best practice. UserOps can succeed on chain A and fail on chain B. The application MUST handle this; the SDK will not.

- **Per-chain status.** Each chain independently tracks `preparing → signing → pending → success | error`, with its own userOpHash, txHash, and error fields. Never report a single aggregate result to the user.
- **Retry only the failed chains.** Nonces are per-chain — a retry of chain B does not interact with chain A's already-included op. A new signature is required: the original is bound to the original multichain hash, which included the failed op.
- **Security ops vs value ops.** Security ops (add/remove owner, threshold change, enable module, add guardian) are idempotent — retry until convergent. Value ops (transfers, swaps, bridge deposits) may not be safely retryable; check on-chain state before resubmitting.

## Pre-submission consistency check (security ops only)

Before any multichain security operation, read the relevant state on every target chain in parallel and verify they agree. If a previous partial failure left configs diverged, surface the diff and let the user choose to sync rather than blindly proceeding. Diverged guardian sets, owner sets, and thresholds are silent footguns and degrade recovery guarantees.

## Gas estimation fragility

Paymaster default bumps are not always enough. Two known categories of pain:

- **Rollup calldata pricing** (Arbitrum and similar) — `preVerificationGas` may need a higher multiplier because rollups bill calldata heavily.
- **WebAuthn signature size** — P-256 verification cost can exceed default `verificationGasLimit` bumps; symptom is AA26 errors on signature verification.

The SDK and paymaster expose knobs for both. Developers should not need them on day one — surface only when they hit a symptom, then point to the docs for current parameter names.

## Passkey handoff

If passkeys are chosen, the passkey skill owns credential creation, storage, and the WebAuthn signature step. This skill still owns chain configuration, account initialization (consuming public key coordinates from the passkey skill), orchestration shape, paymaster phases, partial-failure handling, and retry. The passkey example in the examples repo shows the exact interface — do not invent it.

## Verification before claiming done

Inspecting the orchestrator code is not enough. Exercise the unhappy paths.

- Run end-to-end on at least two testnet account chains.
- Prove the partial-failure path: force one chain to fail (kill an RPC, point at a wrong bundler, etc.) and verify the UI surfaces it and retry-only-failed works.
- For security ops, prove the pre-submission consistency check actually catches a diverged state.

## Red flags

| Symptom | Stop and do this |
|---------|------------------|
| About to write code without answering the four discovery questions | Ask first. The shape changes with each. |
| About to pick a bridge for the developer | Surface the options and the axes. Their call. |
| Conflating "display balance" with "spending balance" | Name them as separate problems. Different solutions. |
| About to invent or guess an SDK method name | Fetch the docs. Do not guess. |
| Single `Promise.all` wrapping the whole flow | Per-chain status; `allSettled` at send time. |
| Claiming "done" without exercising a failure path | Not done. Force a failure and watch retry behave. |
| Sending `eth_call` / `eth_getBalance` to the Candide endpoint | Candide serves bundler + paymaster methods, not execution-client methods. Use a separate RPC for state reads. |
| Hardcoding a single decimals value for the token across chains | Decimals vary (USDT is 18 on BSC, 6 elsewhere). Carry decimals per chain, sourced from the token contract. |
| Mixing native USDC and bridged `USDC.e` without noticing | Different ERC-20s. Pick one flavor per chain and verify the bridge routes between the chosen pair. |
| Asking the user to enter the input amount on the source | Users think in recipient output. Gross up input from output using fresh bridge quotes. |
| Aggregating balance reads with a fail-fast primitive | One dead RPC zeroes out the unified balance. Use a settle-each primitive; degrade per chain. |
| Treating a successful source-chain UserOp as "delivered" | Deposit landing ≠ recipient paid. Track and surface bridge fill status independently per leg. |
| Signing a transfer against a stale bridge quote | Quotes carry freshness windows. Re-quote if signing was slow (passkey, hardware wallet). |
