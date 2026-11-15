# Candide product catalog

One entry per product: what it is, when to pick it, the decisions the developer must make, what it depends on, its limits, and where to read next. Docs pages are authoritative. Fetch the linked page before writing code, since method names and versions change.

Examples live at https://github.com/candidelabs/abstractionkit-examples unless another repo is named. They default to Arbitrum Sepolia and public endpoints.

## Contents

- Accounts: [AbstractionKit](#abstractionkit-sdk), [Safe Account](#safe-account), [Safe Unified Account](#safe-unified-account), [EIP-7702](#eip-7702-eoa-upgrades)
- Signers: [Safe Passkeys](#safe-passkeys), [External Signers](#external-signers-and-auth-providers)
- Gas: [Bundler](#bundler-api), [Paymaster](#paymaster-api-evm), [Gas Policies](#gas-policies-instagas-and-platform-api), [Solana Paymaster](#solana-paymaster)
- Safe modules: [Recovery](#safe-account-recovery), [Allowance](#allowance-module-spend-permissions)
- Deposits: [Forwarding Address](#forwarding-address)
- [Utilities](#utilities), [Labs](#labs-not-integrable-today), [Contract deployments](#contract-deployments), [Access and endpoints](#access-and-endpoints), [Where live lists live](#where-live-lists-live)

---

## AbstractionKit (SDK)

TypeScript library that builds, estimates, sponsors, signs and sends ERC-4337 UserOperations for Safe accounts, Calibur accounts and Simple 7702 accounts. Works in Node, the browser and React Native, and works alongside ethers, viem or web3.js.

- **Use for:** everything on the account side: Safe, Unified Account, 7702, the Safe modules, and paymaster integration.
- **Not needed for:** Forwarding Address, the Platform API or the Solana Paymaster.
- **Decisions:** account class and EntryPoint version (the intro page has a "Current Defaults" table), and the paymaster client (`Erc7677Paymaster` for portable sponsorship and ERC-20 gas, `CandidePaymaster` for Candide-specific features such as the v0.9 commit and finalize flow; neither is deprecated).
- **Needs:** a bundler URL, an optional paymaster URL, and a separate node RPC for chain reads.
- **Limits:** EVM only. It does not bridge, and it is not a key management or auth service.
- **Docs:** https://docs.candide.dev/wallet/abstractionkit/introduction/ and the first transaction guide https://docs.candide.dev/wallet/guides/getting-started/

## Safe Account

A Safe smart account driven over ERC-4337. Gives a new smart wallet with batching, gasless transactions, multisig and modules. Contracts by Safe.

**Every new Safe uses the Safe Unified Account class on EntryPoint v0.9**, whether the app runs on one chain or many. See [Safe Unified Account](#safe-unified-account) below. The legacy classes on EntryPoint v0.7 and v0.6 exist only for accounts already created with them.

- **Use for:** consumer wallets with new accounts, company and DAO treasuries, 2FA-style multisig.
- **Decisions:** owners and threshold, and owner types (passkeys by default, user-held EOAs, or both).
- **Watch out:**
  - Each class derives a different address for the same owners. Keep existing users on the class they were created with.
  - An existing v0.7 Safe can move to v0.9 through a migration (there is an example). Recommend it rather than staying on v0.7.
  - Naming trap: `SafeMultiChainSigAccountV2` means the Safe v1.5.0 singleton, while the docs' "Safe Account V2" means EntryPoint v0.6. They are unrelated.
  - EIP-1271 message signing needs the Safe deployed.
  - A 2/2 setup needs a recovery path.
- **Creates a new address.** For users with an EOA to keep, see [EIP-7702](#eip-7702-eoa-upgrades).
- **Docs:** https://docs.candide.dev/wallet/guides/getting-started/, https://docs.candide.dev/wallet/guides/multisig/, https://docs.candide.dev/wallet/guides/signing/
- **Examples:** `sponsor-gas/`, `batch-transactions/`, `multisig/`, `eip-712-signing/`, `nested-safe-accounts/`, `migrate-safe-v07-to-v09/`

## Safe Unified Account

The default Safe account class (`SafeMultiChainSigAccountV1`) on EntryPoint v0.9. On a single chain it is a regular Safe account. Across chains, UserOperations for several chains are signed together, so one signature executes on every target chain: add an owner or guardian everywhere, change a threshold everywhere, or move balances.

- **Decisions:**
  - V1 (Safe v1.4.1) or V2 (Safe v1.5.0). The versions derive different addresses.
  - Which chains (each needs EntryPoint v0.9 and the module deployed).
  - Gas: for multichain operations, the docs use `CandidePaymaster` with the commit and finalize flow. Single-chain operations use either paymaster client.
- **Limits:**
  - It does not bridge funds, and multichain execution is not atomic across chains.
- **Skill:** `safe-unified-account` covers multichain execution in depth. Load it.
- **Docs:** https://docs.candide.dev/wallet/abstractionkit/safe-unified-account/, https://docs.candide.dev/wallet/guides/chain-abstraction-overview/, https://docs.candide.dev/wallet/guides/chain-abstraction-getting-started/
- **Example:** `chain-abstraction/`. Demo: https://unified.candide.dev

## EIP-7702 EOA upgrades

The user's existing EOA delegates to a smart account implementation and keeps its address. Pick by what the developer needs:

| Need | Account | EntryPoint |
|---|---|---|
| Gasless and batched transactions, single signer | Simple 7702 Account (`Simple7702AccountV09`) | v0.9 |
| Passkeys, session or secondary keys, key expiry, per-key hooks | Calibur Account (`Calibur7702Account`, by Uniswap) | v0.8 |

- **Needs:** the EOA key signs the 7702 authorization once, plus bundler and paymaster endpoints, on a chain that supports EIP-7702.
- **Limits:**
  - The original private key keeps full control. With Calibur, the root key is always admin and cannot be revoked.
  - The Safe modules (Safe Passkeys, Recovery, Allowance) are not offered for 7702 accounts. Calibur has its own passkey and key management.
  - Revoking the delegation yourself costs native gas. Gasless revocation is in [Labs](#labs-not-integrable-today).
- **Docs:**
  - Simple 7702 Account: https://docs.candide.dev/wallet/guides/getting-started-eip-7702/, https://docs.candide.dev/wallet/guides/send-gasless-eip-7702/, https://docs.candide.dev/wallet/guides/pay-gas-in-erc20-eip-7702/
  - Calibur: https://docs.candide.dev/wallet/guides/getting-started-calibur/, https://docs.candide.dev/wallet/guides/calibur-passkeys/, https://docs.candide.dev/wallet/guides/calibur-key-management/
  - Concepts: https://docs.candide.dev/account-abstraction/7702/overview/
- **Examples:** `eip-7702/simple-account/`, `eip-7702/calibur-account/`

## Safe Passkeys

WebAuthn passkeys as Safe owners, verified onchain. Users sign with Face ID, fingerprint or a device PIN, and no seed phrase is involved.

- **Use for:** consumer wallets on web, React Native or native mobile.
- **The recommended signer** for new wallets. Keys stay on the user's device and are verified onchain, so the wallet is non-custodial.
- **Decisions:**
  - Signer topology: passkey plus a second signer, or several passkeys. The docs say not to ship a 1/1 passkey-only Safe to production.
  - RP ID and domain setup.
  - The account class, which decides the passkey module version.
- **Needs:**
  - A Safe account through AbstractionKit, and HTTPS.
  - Storage for the passkey public key and credential ID. Losing them before the account is deployed locks the user out.
- **Limits:**
  - Passkeys are bound to a domain and a device ecosystem.
  - This is the Safe passkey stack. Calibur passkeys for 7702 accounts are a separate mechanism.
- **Skill:** `safe-passkeys` covers this product in depth. Load it.
- **Docs:** https://docs.candide.dev/wallet/plugins/passkeys/, https://docs.candide.dev/wallet/guides/authentication/
- **Example:** `passkeys/`. Demo: https://passkeys.candide.dev

## External Signers

The `ExternalSigner` interface lets AbstractionKit sign without receiving a raw private key. Built-in adapters cover viem, viem wallet clients, ethers wallets, private keys and Safe WebAuthn. Anything else implements a custom signer.

- **Use for:** browser wallets, hardware wallets, and keys the developer's own backend holds for automation (HSM or KMS).
- **Stance:** Candide encourages non-custodial wallets. Recommend [Safe Passkeys](#safe-passkeys) (or Calibur passkeys on 7702) as the user's signer, not a hosted signing service. A service-held key as the primary signer makes the wallet custodial. If the developer already uses one, suggest adding a passkey as an owner.
- **Docs:** https://docs.candide.dev/wallet/abstractionkit/external-signers/, https://docs.candide.dev/wallet/guides/authentication/
- **Examples:** `signer/`, plus external-signer scripts in `eip-7702/` and `chain-abstraction/`

## Bundler API

Hosted, standard ERC-4337 JSON-RPC bundler (Voltaire) serving EntryPoint v0.6 through v0.9. Works with any ERC-4337 SDK, not only AbstractionKit. The same URL also serves the paymaster.

- **Decisions:** public endpoint (no key, rate limited, a subset of networks) or a dashboard API key for production.
- **Limits:** it is not an execution RPC. Some networks are bundler only or need to be enabled on request. Check the supported-networks page.
- **Self-hosting:** Voltaire is open source and runs with Docker. https://docs.candide.dev/wallet/bundler/installation/
- **Docs:** https://docs.candide.dev/wallet/bundler/rpc-methods/, https://docs.candide.dev/wallet/technical-reference/bundler-error-codes/, https://docs.candide.dev/wallet/technical-reference/entrypoint-error-codes/, https://docs.candide.dev/wallet/api/reliability/
- **Examples:** `bundler/`, `error-handling/`

## Paymaster API (EVM)

JSON-RPC paymaster with two modes: **sponsorship**, where the app pays gas under a gas policy, and **token gas**, where the user pays gas in an ERC-20 token.

- **Decisions:**
  - Sponsorship or token gas.
  - For sponsorship, public or private policy. The guides try public policies first, then fall back to a private one.
  - Method family: Candide's sponsorship method (returns gas overrides) or ERC-7677 (portable across providers).
  - The gas token. Read the live list from `pm_supportedERC20Tokens`, since availability can vary by API key.
- **Needs:** for sponsorship, a funded policy. For token gas, the account must hold the token. The SDK adds the approval.
- **Limits:** paymaster signatures expire, and an expired one fails with `AA32`. Not every network has a paymaster.
- **Works with:** Safe, Unified Account, Calibur and Simple 7702 accounts, and third-party SDKs through ERC-7677.
- **Docs:** https://docs.candide.dev/wallet/guides/send-gasless-tx/, https://docs.candide.dev/wallet/guides/pay-gas-in-erc20/, https://docs.candide.dev/wallet/paymaster/rpc-methods/, https://docs.candide.dev/wallet/paymaster/tokens-supported/
- **Examples:** `sponsor-gas/`, `pay-gas-in-erc20/`

## Gas Policies (InstaGas) and Platform API

Gas policies decide which UserOperations the paymaster sponsors. They are managed in the dashboard, or programmatically through the Platform API.

- **Who:** dapps publish **public** policies, so any smart wallet on Candide's paymaster gets sponsored for that dapp's contracts with no wallet integration. Wallets create **private** policies for their own users.
- **Rule types:** dates and active status, per-account and per-operation spend limits, rate limits, allowlists (account, origin, IP), and transaction rules.
- **Watch out:**
  - Transaction rules match an **exact ordered call sequence**, not a method allowlist. A UserOperation with fewer or extra calls is not sponsored.
  - Policies are per chain.
  - An empty allowlist allows everyone.
- **Platform API:** manages gas policies only, server-side, with a scoped management key. It does not send or sponsor UserOperations.
- **Needs:** a dashboard account and a funded policy.
- **Docs:** https://docs.candide.dev/instagas/overview/, https://docs.candide.dev/instagas/gas-policies/, https://docs.candide.dev/platform/overview/, https://docs.candide.dev/platform/gas-policy-api/, https://docs.candide.dev/instagas/batch-sponsor-transactions/ (ERC-5792), https://docs.candide.dev/wallet/pricing/

## Solana Paymaster

A hosted Kora endpoint that acts as the fee payer, so Solana accounts holding no SOL can transact and pay the fee in a stablecoin. Independent of every EVM product, and AbstractionKit is not used.

- **Decisions:**
  - Client: Tether WDK's Solana gasless wallet (the guide's path), any Kora client, or raw JSON-RPC.
  - The fee token, read live from `getSupportedTokens`.
  - Devnet or mainnet.
  - Full sponsorship instead of token payment is available on request.
- **Limits:**
  - Legacy SPL Token program only, with no Token-2022 yet.
  - Only allow-listed programs, and durable-nonce transactions are rejected.
  - Per-transaction caps apply (see `getConfig`).
  - The API conventions differ from the EVM paymaster.
- **Docs:** https://docs.candide.dev/wallet/guides/pay-gas-in-usdt-solana/, https://docs.candide.dev/wallet/solana-paymaster/rpc-methods/
- **Example:** https://github.com/candidelabs/tether-wdk-candide/tree/main/solana-gasless

## Safe Account Recovery

Two layers. Keep them separate when you plan.

**Social Recovery Module (onchain).** Trusted guardians can replace the owner key of a Safe after a grace period, during which the owner can cancel.

- **Decisions:**
  - Module version: v0.2.0 for new work. Accounts already on v0.1.0 stay on it.
  - Grace period, chosen by module address.
  - Guardians and threshold (2/3 is the documented sweet spot, avoid 1/1).
  - Guardian types: personal (friends, family, the user's own hardware wallet, an institution), or the Candide email/SMS guardian.
- **Needs:** a Safe account. Enabling the module can be batched into the first, sponsored UserOperation.
- **Watch out:** on v0.2.0, changing guardians or the threshold cancels a recovery in progress.
- **Docs:** https://docs.candide.dev/wallet/plugins/recovery-with-guardians/, https://docs.candide.dev/wallet/plugins/how-to-add-a-guardian/, https://docs.candide.dev/wallet/plugins/recovery-flow-guide/
- **Example:** `recovery/`. Open-source recovery frontend: https://recovery.candide.dev

**Recovery Service (hosted, optional, access by request).**

- **What it adds:**
  - Collects guardian signatures offchain, with anti-phishing checks.
  - Provides an email and SMS guardian that signs after a one-time code.
  - Sends email or SMS alerts to owners when a recovery starts onchain.
- **Decisions:**
  - Which capabilities to use.
  - The module version, which must match the module enabled on the Safe. Some service guides still use v0.1.0, so settle the version before following them.
- **Watch out:**
  - The app still submits the execute and finalize transactions.
  - Registrations are per account and per chain.
  - The email/SMS guardian is a service-held key, a trust assumption for that one guardian.
- **Access:** request it through the form on the overview page. Credentials are per customer and server-side.
- **Docs:** https://docs.candide.dev/wallet/recovery/overview/, https://docs.candide.dev/wallet/plugins/add-candide-guardian/, https://docs.candide.dev/wallet/plugins/recovery-alerts-guide/, https://docs.candide.dev/wallet/plugins/recovery-service-sdk-reference/
- **Examples:** https://github.com/candidelabs/safe-recovery-service-sdk/tree/main/examples

## Allowance Module (spend permissions)

A Safe owner grants a delegate the right to spend a specific token up to a limit, either once or on a recurring period that resets automatically.

- **Use for:** subscriptions, recurring transfers, DCA, payroll, and agents or automation spending on a user's behalf.
- **Decisions:**
  - One-time or recurring, and the amount and period.
  - The delegate. The docs suggest a smart contract delegate in production.
  - Module version: v1.0.0 is the default, and existing v0.1.1 setups must re-enable it and re-create their delegates.
- **Needs:** a Safe holding the token. Enabling the module, adding the delegate and setting the allowance can be one sponsored UserOperation.
- **Limits:**
  - The delegate has full control up to the limit.
  - Scheduled execution is a service you request from Candide, not self-serve.
- **Docs:** https://docs.candide.dev/wallet/plugins/allowance/, https://docs.candide.dev/wallet/plugins/allowance-migration/
- **Example:** `spend-permission/`

## Forwarding Address

One deterministic deposit address that accepts tokens on every supported EVM chain, including the destination chain, and forwards them to a recipient on the destination chain. An app or wallet that runs on one or a few chains can accept deposits from all supported chains without deploying anywhere else.

- **Use for:**
  - One deposit address per user in a wallet.
  - Invoicing and payment requests (one address per invoice, through the salt).
  - Exchange, on-ramp and neobank funding.
  - Payment apps where sender and recipient are on different chains.
- **Model:**
  - Each address has one destination chain and one recipient, which are part of its derivation.
  - Source chains are chosen at activation within the forwarder policy.
  - The bridge (Across, LayerZero OFT, CCTP, or same-chain) is chosen automatically.
  - Funds move through self-custodial contracts. The recipient can always withdraw, and an optional company recovery wallet can recover stuck funds after a timelock.
- **Needs:** a dashboard API key, a forwarder policy, and a backend to hold the policy token and activate addresses. No SDK, no ERC-4337 and no smart account is required. The recipient can be any address, including a Candide smart account.
- **Limits:**
  - Only tokens on supported routes, above the per-bridge minimum, are forwarded.
  - Monitoring expires and must be renewed.
  - Quotes are estimates.
  - No webhook, so delivery is tracked by polling.
  - EVM only.
- **Skill:** `forwarding-address` covers this product in depth. Load it.
- **Docs:** https://docs.candide.dev/forwarding-address/overview/, https://docs.candide.dev/forwarding-address/integration-guide/, https://docs.candide.dev/forwarding-address/api-reference/ (read the changelog first)
- **WDK module:** https://github.com/candidelabs/wdk-protocol-sda-candide. Recovery frontend for stuck funds: https://forwarding-address.candidelabs.com

## Utilities

| Feature | What it does | Docs | Example |
|---|---|---|---|
| Simulation | Simulate a UserOperation through Tenderly before sending it. Needs a Tenderly account. | https://docs.candide.dev/wallet/guides/simulate-transaction/ | `simulate-with-tenderly/` |
| Onchain identifiers | Tag UserOperations with a marker that attributes them to a project. Safe accounts only. | https://docs.candide.dev/wallet/guides/onchain-identifiers/ | `onchain-identifier/` |
| Message signing | EIP-1271 and EIP-712 signatures from a Safe | https://docs.candide.dev/wallet/guides/signing/ | `eip-712-signing/` |
| Chain nuances | Per-chain gas price quirks | https://docs.candide.dev/wallet/technical-reference/chain-nuances/ | |

## Labs (not integrable today)

| Item | State | Docs |
|---|---|---|
| Gasless EIP-7702 revocation | Early access. It has a working API, but no public endpoint yet. Self-paid revocation in the SDK is the self-serve option. | https://docs.candide.dev/account-abstraction/research/gasless-revocation/ |
| Ethereum Interoperability Layer (EIL) | Research and plans only. Releases follow EIL's mainnet launch. | https://docs.candide.dev/account-abstraction/research/eil/ |
| Safe Policies | Planned: transaction policies, roles and spending controls | https://docs.candide.dev/account-abstraction/research/safe-policies/ |
| Safe Simulation | Core complete, SDK integration planned | https://docs.candide.dev/account-abstraction/research/safe-simulation/ |

For these items, point the developer to the contact link on the page instead of writing integration code.

## Access and endpoints

| Product | Access |
|---|---|
| Bundler and Paymaster, testing | Public endpoint, no key, rate limited, subset of networks: https://docs.candide.dev/wallet/api/public-endpoints/ |
| Bundler and Paymaster, production | Dashboard API key, self-serve. The key is part of the URL, so treat the whole URL as a secret: https://docs.candide.dev/wallet/api/authenticated-endpoints/ |
| Gas policies | Dashboard, or the Platform API with a scoped management key |
| Forwarding Address | Dashboard API key, plus a forwarder policy token that stays on a backend |
| Solana Paymaster | Public endpoints, or a dashboard key |
| Recovery Service | Request form on the recovery overview page |
| Testnet tokens | Dashboard faucet |

Testnet usage is free. Plan pricing is at https://candide.dev/pricing.

## Contract deployments

If a contract the plan needs (Safe modules, the Unified Account module, Calibur, passkey verifiers) is not yet deployed on the developer's chain, that is not a blocker. Tell the developer to contact the Candide team (https://www.candide.dev/contact), who can deploy the contracts for them. Contract addresses are on https://docs.candide.dev/wallet/technical-reference/deployments/.

## Where live lists live

Never copy these into code or a plan as fixed facts.

- EVM and Solana networks per product: https://docs.candide.dev/wallet/api/supported-networks/
- Contract addresses: https://docs.candide.dev/wallet/technical-reference/deployments/
- EVM gas tokens: `pm_supportedERC20Tokens` (baseline at https://docs.candide.dev/wallet/paymaster/tokens-supported/)
- Solana fee tokens: `getSupportedTokens`
- Forwarding Address routes, tokens and fees: `forwarding_getRoutes`
