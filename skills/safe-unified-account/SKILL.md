---
name: safe-unified-account
description: Use when integrating Candide's Safe Unified Account for multichain smart accounts and chain abstraction with the abstractionkit SDK — building apps that execute operations across multiple EVM chains with a single signature. Triggers on mentions of Safe Unified Account, multichain smart account, chain abstraction, abstractionkit, SafeAccount, ERC-4337 across chains, multichain UserOperation, or single-signature multichain execution.
---

# Safe Unified Account Integration

Single smart account across every EVM chain. One signature executes operations on all chains simultaneously. Built on [abstractionkit](https://docs.candide.dev) SDK.

## Source Priority

When writing code, follow this order strictly:

1. **Docs** — https://docs.candide.dev/wallet/guides/chain-abstraction-overview/
2. **Examples** — https://github.com/candidelabs/abstractionkit-examples — read `chain-abstraction/add-owner.ts` (ECDSA) or `chain-abstraction/add-owner-passkey.ts` (passkey)
3. **Demo repo** — https://github.com/candidelabs/safe-unified-account-demo — reference `src/logic/userOp.ts` for orchestrator and `src/components/SafeCard.tsx` for failure handling

**Do NOT invent API calls.** Copy method signatures, parameter types, and return types from the sources above. If a method or parameter is not in the docs or examples, do not use it.

### When sources disagree

- **Examples** win for: exact SDK call shapes, method parameters, return types, import paths — these are the most up-to-date code
- **Docs** win for: SDK version, supported chains, endpoint URLs, paymaster policy, SDK reference
- **Demo repo** is a reference only — useful for seeing patterns (failure handling, retry logic, UI state) but may lag behind the SDK. Do not copy from the demo if it contradicts the examples or docs.

## Execution Rules

**Write code immediately after reading the sources.** Do not stop at architectural advice, design suggestions, or summaries unless the developer explicitly asked for design-only guidance. The default is implementation, not commentary.

**Prefer adapting to the existing stack.** For existing projects (Q1), integrate into the developer's current file structure, frameworks, and patterns. Do not introduce new frameworks, restructure their project, or create duplicate abstractions. If they use Redux, use Redux. If they use plain React state, use plain React state. Minimal footprint.

**After implementation, report what you built.** List each file you created or modified and state which of the 4 required outputs it contains. Example: "`src/lib/unified-account.ts` — contains chain config (#1), account init (#2), and orchestrator (#3). `scripts/verify.ts` — verification script (#4)."

## Before You Start

Ask the developer these 4 questions before writing any code:

**Q1: New app or existing project?**
- New app → scaffold project with dependencies, tsconfig, env/config file
- Existing → install `abstractionkit` into their project, add chain config. Do not over-scaffold.

**Q2: Signer type?**
- **ECDSA private keys** — simpler integration. One method call handles multichain signing.
- **Passkeys (WebAuthn P-256)** — requires the **passkey integration skill** (see Passkey Handoff below). This skill owns the multichain flow; the passkey skill owns credential creation, storage, and signing.

**Q3: Paymaster — who pays for gas?**
- **Gas sponsorship** (CandidePaymaster) — app sponsors gas, free for users. Uses two-phase commit/finalize.
- **ERC-20 token payment** — user pays gas in tokens (USDC, etc). Uses `createTokenPaymasterUserOperation()`.

**Q4: Which chains?**
- Developer names their target chains (e.g., "Ethereum + Optimism + Base")
- If unsure, suggest 2-3 Sepolia testnets to start — zero signup required
- Fetch the current supported chain list from https://docs.candide.dev/wallet/bundler/rpc-endpoints/ — do not hardcode

**Then, before writing code:**
- Fetch the recommended SDK version from the docs (Source #1) — install whichever version the docs specify
- Read the matching code example (Source #2) end-to-end before writing anything

## Required Outputs

You MUST produce these four building blocks. Adapt file structure to the developer's project, but all four must exist:

**1. Chain configuration** — `ChainConfig` object or loader with per-chain:
- `chainId: bigint`
- `bundlerUrl: string` — Candide endpoint
- `rpcUrl: string` — standard JSON-RPC provider (NOT Candide — see gotcha below)
- `paymasterUrl: string` — Candide endpoint

**2. Account initialization** — function that:
- Takes an owner (ECDSA address or passkey public key coordinates)
- Returns a `SafeAccount` instance with deterministic address
- Handles both new accounts (`initializeNewAccount`) and existing (`new SafeAccount(address)`)

**3. Multichain signing orchestrator** — function that:
- Takes: MetaTransactions (per chain or shared), chain configs, signer credentials
- Executes the 6-step flow (build txs → create userOps → paymaster commit → sign → paymaster finalize → send)
- Returns: per-chain results where each chain independently tracks `userOpHash`, `txHash`, and `error` fields through the lifecycle: preparing → signing → pending → success (or error)
- Uses `Promise.allSettled()` for sending (NOT `Promise.all()`)
- Implements retry logic for failed chains

**4. Verification script** — standalone script that:
- Auto-generates an ECDSA keypair (no browser needed)
- Runs the full flow on the developer's configured testnet chains
- Verifies the operation succeeded on all chains (e.g., `getOwners()`)
- Prints per-chain results
- Based on the ECDSA example from Source #2
- Runs with `npx tsx verify.ts`

## Setup

Install `abstractionkit` as the core dependency. For utility functions (key generation, address derivation), use whichever Ethereum library the developer already has — **viem** or **ethers**. Both work with abstractionkit. Do not add viem to a project that already uses ethers, or vice versa.

If passkeys chosen, the passkey skill specifies additional dependencies.

## Chain Configuration Gotcha

Each chain needs **three separate endpoints** — this is the most common integration mistake:

1. **Bundler URL** — Candide endpoint, for submitting UserOperations
2. **Paymaster URL** — Candide endpoint, for gas sponsorship or token payment
3. **JSON-RPC provider URL** — standard RPC (NOT Candide), for reading state, nonces, gas prices

The Candide public endpoint (`https://api.candide.dev/public/v3/{chainId}`) serves as both bundler and paymaster, but it is NOT a JSON-RPC provider. The developer needs a separate RPC per chain (e.g., `publicnode.com`, `drpc.org`, Infura, Alchemy).

Validate the developer's chain choices against https://docs.candide.dev/wallet/bundler/rpc-endpoints/ (same page as Q4). For the public endpoint URL pattern, see https://docs.candide.dev/wallet/bundler/public-endpoints/. For higher rate limits: [Candide Dashboard](https://dashboard.candide.dev/).

## Core Multichain Flow

The orchestrator follows a 6-step flow. Get the exact code from Sources #1 and #2. Here is the conceptual flow — do not implement from this description alone:

1. **Build MetaTransactions** — operation-agnostic: any `{ to, value, data }` works. Same tx for all chains, or different per chain.
2. **Create UserOperations per chain** — one `createUserOperation()` call per chain.
3. **Paymaster commit** — `signingPhase: "commit"` on each chain. For token paymaster, use `createTokenPaymasterUserOperation()`.
4. **Sign** — ECDSA: single `signUserOperations()` call. Passkeys: delegate to passkey skill (see Passkey Handoff).
5. **Paymaster finalize** — `signingPhase: "finalize"` to seal paymaster data after signing.
6. **Send concurrently** — `Promise.allSettled()`, then `response.included()` for each.

## Passkey Handoff

This skill owns the multichain flow. The passkey skill owns WebAuthn. The interface between them:

**This skill provides to the passkey skill:**
- `userOpsToSign`: array of `{ userOperation: UserOperationV9, chainId: bigint }` — the committed, unsigned operations

**This skill expects back from the passkey skill:**
- `signatures`: `string[]` — one hex-encoded signature per chain, in the same order as `userOpsToSign`
- Each signature is the output of `formatSignaturesToUseroperationsSignatures()`, already formatted for the UserOperation

**This skill still owns** (even when passkeys are chosen):
- Steps 1-3 (build txs, create userOps, paymaster commit)
- Steps 5-6 (paymaster finalize, send)
- Partial failure handling and retry
- Chain configuration and account initialization (using public key coordinates from the passkey skill)

## Paymaster Integration

Two options, both using the same two-phase commit/finalize pattern:

**Gas sponsorship** (`createSponsorPaymasterUserOperation`): App pays gas. Optional `sponsorshipPolicyId` for gated policies.

**ERC-20 token payment** (`createTokenPaymasterUserOperation`): User pays in tokens. Paymaster auto-prepends token approval. Same two-phase pattern.

Both call the paymaster twice: before signing (commit) and after (finalize).

## Partial Failure Handling

**There is no cross-chain atomicity.** A UserOp can succeed on chain A and fail on chain B. The application MUST handle this. The docs and examples show the happy path — this section covers what they don't.

### Per-chain status tracking

Track independent status per chain through the lifecycle: preparing → signing → pending → success (or error). Each chain entry must independently track `userOpHash`, `txHash`, and `error` fields. Always use `Promise.allSettled()`. Reference `src/components/SafeCard.tsx` in Source #3 for the pattern.

### Retry failed chains

1. Store original transactions for resubmission
2. Identify failed chain indices
3. Rebuild UserOps for only the failed chains
4. Run full sign-and-send flow for the failed subset (new signature required)
5. Update status per chain

Nonces are per-chain — retrying failed chains does not conflict with succeeded ones.

### Account security operations vs value operations

**Account security ops** (add/remove owner, change threshold, enable module): Partial failure = different security configs across chains. App MUST surface this and provide retry/sync. Retrying is safe — idempotent.

**Value ops** (transfers, swaps): May not be safely retryable. Show per-chain results, let user decide.

### Pre-submission consistency check

Before multichain security operations, verify account state is consistent across all target chains. If a previous partial failure left different configs, warn before proceeding.

### Key persistence

- **ECDSA**: Developer stores private key securely (env var, encrypted store, hardware module).
- **Passkeys**: Handled by the passkey skill.

## Verification Checklist

Before claiming the integration is complete, verify these four paths work:

1. **Account init** — `SafeAccount.initializeNewAccount()` returns a valid account with deterministic address
2. **Multichain send** — the orchestrator successfully sends UserOps to at least 2 testnet chains and both confirm
3. **Per-chain status** — the orchestrator correctly reports independent status per chain (not a single aggregate)
4. **Retry path** — if one chain is simulated as failed (or actually fails), the retry logic rebuilds and resends only the failed chain

Run the verification script to prove paths 1 and 2. Inspect the orchestrator code for paths 3 and 4.

## Additional References

- [Supported networks](https://docs.candide.dev/wallet/bundler/rpc-endpoints/)
- [Public endpoints](https://docs.candide.dev/wallet/bundler/public-endpoints/)
- [Passkeys integration guide](https://docs.candide.dev/wallet/plugins/passkeys/)
- [Candide Dashboard](https://dashboard.candide.dev/) — dedicated endpoints with higher rate limits
