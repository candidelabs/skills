---
name: overview
description: Use first when a developer wants to build with Candide or asks which Candide product fits their use case, before any product-specific skill. Maps use cases (consumer wallet, existing EOA users, gas sponsorship, stablecoin gas, cross-chain deposits, invoicing, recovery, multisig, subscriptions, Solana fees) to Candide products and shows how they combine. Triggers on Candide, candide.dev, smart account, smart wallet, account abstraction, ERC-4337, EIP-7702, gasless, sponsor gas, paymaster, bundler, pay gas in USDC or USDT, deposit address, multichain deposits, account recovery, passkey wallet, upgrade EOA, spend permissions, Safe account, or "which Candide product should I use".
---

# Candide: choose the right products

You are helping a developer decide which Candide products to use and how they fit together. Candide is smart account infrastructure for wallets, payments and deposits, on EVM chains and Solana. Most real integrations combine several products, so your job is to understand the use case, propose a combination, and hand off to the right skill or docs page.

This skill is for routing and judgment only. It leaves out method names, parameters and response shapes. Fetch those from the docs page linked for each product before writing code. Do not invent SDK calls.

Per-product details (what each one does, decisions, prerequisites, limits, docs and examples) are in [products.md](products.md). Read the entries for the products you are about to recommend.

## How Candide is built

- **Standards first, no lock-in.** AbstractionKit (the TypeScript SDK) follows ERC-4337, EIP-7702 and ERC-7677. The hosted bundler and paymaster work with any compliant SDK, and AbstractionKit works with other compliant providers. Tell developers this when lock-in comes up.
- **Non-custodial by design.** Candide encourages developers to build wallets their users control. The recommended signer is an onchain passkey, verified by the account contract itself, not a key held by a hosted service.
- **Built on Safe** for new smart accounts, on the latest EntryPoint (v0.9) through the Safe Unified Account class. That class works on a single chain as well as across many, so it is the default for every new Safe. Safe modules add passkeys, recovery and spend permissions. EIP-7702 upgrades use Calibur (by Uniswap) or the Simple 7702 Account instead.
- **Open source:** AbstractionKit, the Voltaire bundler and the smart contracts. The paymaster, gas policies, Forwarding Address relayer, recovery service and dashboard are hosted services.
- **Self-serve access.** A dashboard API key unlocks the bundler, paymaster and Forwarding Address. Public endpoints with no key exist for testing on a subset of networks. The Recovery Service is by request.

## Phase 1: understand the use case

Ask these before recommending anything. Skip the ones the developer has already answered. Each answer changes the product set.

1. **What are you building?** Consumer wallet, embedded wallet in an app, dapp, payments or invoicing app, exchange or neobank, treasury or multisig, agent or automation.
2. **Do your users already have EOAs** (MetaMask or another wallet they control), or are you creating new accounts? Existing addresses to keep point to EIP-7702. New accounts point to a Safe.
3. **How do users sign?** Recommend onchain passkeys (Face ID, fingerprint, device PIN) as the default. Other user-controlled options are a browser or hardware wallet, or a key the developer's own backend holds for automation.
4. **Which chains does the app run on, and where do users' funds come from?** This doesn't change the account choice: a new Safe uses the Safe Unified Account class on one chain or many. It decides whether to plan multichain execution, and whether Forwarding Address should bring in funds from chains the app doesn't run on.
5. **Who pays gas?** You (sponsorship), the user in a stablecoin (token paymaster), or the user in the native token. On Solana, the Solana Paymaster covers fees in a stablecoin.
6. **What happens when a user loses their key or device?** This decides recovery: guardians, the email/SMS guardian, alerts, or a second signer.
7. **Does anyone else need limited spending rights?** Subscriptions, recurring payments, agents, payroll. This points to the Allowance module or Calibur scoped keys.

## Phase 2: propose a combination

Start from the closest row, adjust it to the answers, and confirm the plan with the developer before writing code.

| Use case | Products | Hand off to |
|---|---|---|
| New consumer wallet, on one chain or many | Safe Unified Account (EntryPoint v0.9) + Safe Passkeys + Recovery (guardians, optionally the email/SMS guardian and alerts) + gas sponsorship | `safe-passkeys` and `safe-unified-account` skills, then the Recovery and Paymaster entries in products.md |
| Actions on many EVM chains with one signature (add an owner or guardian everywhere, move balances) | Safe Unified Account multichain execution + paymaster | `safe-unified-account` skill |
| Existing EOA users who should keep their address and get gasless, batched transactions | EIP-7702 Simple Account + paymaster | EIP-7702 entry in products.md |
| Existing EOA users who also need passkeys, session keys or scoped keys | EIP-7702 Calibur Account + paymaster | EIP-7702 entry in products.md |
| Dapp that wants to sponsor gas for any smart wallet user | Public gas policy (dashboard or Platform API) | Gas Policies entry in products.md |
| Wallet that sponsors its own users | Private gas policy + paymaster | Gas Policies and Paymaster entries in products.md |
| Users who hold only stablecoins | Token paymaster (pay gas in ERC-20) on EVM, Solana Paymaster on Solana | Paymaster or Solana Paymaster entry in products.md |
| App or wallet live on one or a few chains that must accept deposits from every chain | Forwarding Address, sending to the user's account on the app's chain | `forwarding-address` skill |
| Invoicing or payment requests where payers use different chains | Forwarding Address, one address per invoice | `forwarding-address` skill |
| Exchange, on-ramp or neobank deposit addresses | Forwarding Address with a company recovery wallet | `forwarding-address` skill |
| Treasury, DAO or company account | Safe Unified Account as a multisig + simulation, optionally Recovery | Safe Account entry in products.md |
| Subscriptions, recurring payments, agents spending on a user's behalf | Safe + Allowance module, or Calibur non-admin keys with expiry | Allowance or EIP-7702 entry in products.md |
| Team already using another ERC-4337 SDK, or running its own infrastructure | Hosted Bundler + Paymaster through standard RPC, or the self-hosted Voltaire bundler | Bundler and Paymaster entries in products.md |
| Solana app whose users hold no SOL | Solana Paymaster | Solana Paymaster entry in products.md |

When you write the plan, name each product, say why it is in the plan, list the decisions the developer still has to make (from products.md), and link the docs page you will follow.

## How the products layer

Think in layers. Most integrations pick one option per layer, and the deposit layer is independent of the rest.

1. **Account:** a new Safe through the Safe Unified Account class on EntryPoint v0.9 (one chain or many), or an existing EOA upgraded with EIP-7702 (Simple or Calibur). This choice decides what else is available: Safe modules work only with Safe accounts.
2. **Signer:** onchain passkeys by default, or another key the user controls (browser or hardware wallet). Several owners make a multisig.
3. **Gas:** sponsorship under gas policies, or the user pays in an ERC-20 token. The bundler submits the transaction either way.
4. **Safe modules (Safe accounts only):** Recovery for lost keys, Allowance for delegated spending.
5. **Deposits:** Forwarding Address receives funds from any supported chain and delivers them to one recipient address on the destination chain. The recipient can be any address, including a Candide smart account. It needs no SDK and no ERC-4337.

Forwarding Address and the Safe Unified Account solve opposite problems and work well together. Forwarding Address brings funds in from other chains to the chain where the app lives. The Unified Account sends actions out to many chains with one signature.

## Hard rules

- **Check the account type before recommending a Safe module.** Passkeys (the Safe passkey module), Recovery and Allowance require a Safe account. For EIP-7702 users, passkeys and scoped keys come from Calibur, and the docs offer no Candide recovery or allowance module for 7702 accounts.
- **Build non-custodial.** Recommend onchain passkeys as the signer. Don't suggest hosted or MPC signing services. If the developer already uses one, explain that a service-held key as the primary signer makes the wallet custodial, and suggest adding a passkey as an owner.
- **New Safe accounts use the Safe Unified Account class on the latest EntryPoint (v0.9), even on one chain.** Don't start new work on older EntryPoints or legacy Safe classes. The class decides the account address, so an existing user base stays on the class it was created with, and v0.7 Safes have a migration path. See products.md before touching legacy accounts.
- **Never hardcode chains, tokens, routes or contract addresses.** They change. Send the developer to the supported-networks page, the deployments page, or the live RPC method listed in products.md, and check that every product in the plan is available on the developer's chains.
- **A missing contract deployment is not a blocker.** If a contract the plan needs isn't deployed on the developer's chain yet, tell them to contact the Candide team (https://www.candide.dev/contact), who can deploy it for them.
- **Keep secrets on a backend.** Dashboard API keys appear in the endpoint URL path, and the Forwarding Address policy token, the Platform API key and Recovery Service credentials are server-side secrets. A key used from a frontend should be restricted by a gas policy.
- **Say clearly what is not available yet.** The Labs items (EIL, Safe Policies, Safe Simulation) are not integrable today. Gasless 7702 revocation is early access. Point to Candide's contact for these rather than writing code against them.
- **Fetch before coding.** Before writing code for any product, read its linked docs page and example. The docs are authoritative over this skill.

## Common mistakes

- **Treating products as alternatives when they stack.** A wallet usually needs an account, a signer, a gas option and a recovery path, not just one of them.
- **Creating new Safe accounts for users who already have EOAs they want to keep.** That gives them a new address. Offer EIP-7702 first and explain the tradeoff.
- **Offering Safe Recovery or the Allowance module on an EIP-7702 account.** They are Safe modules.
- **Recommending a hosted signing service as the wallet's signer.** That makes the wallet custodial. Recommend onchain passkeys.
- **Treating the Safe Unified Account as multichain-only.** It is the default Safe class on a single chain too.
- **Shipping a single passkey as the only signer.** Pair passkeys with a recovery method or a second signer.
- **Assuming a gas policy is a method allowlist.** A policy's transaction rules match an exact ordered call sequence. Read the Gas Policies entry before writing one.
- **Calling the bundler URL an execution RPC.** The Candide endpoint serves bundler and paymaster methods. Reads like balances and nonces need a separate node RPC.
- **Promising Forwarding Address works for any token or any amount.** Only tokens on supported routes, above the per-bridge minimum, are forwarded.
- **Assuming the SDK bridges funds.** The Unified Account executes on many chains, but bridging is the developer's own call to a bridge. Forwarding Address bridges, but only for inbound deposits.
