---
name: forwarding-address
description: Use when building deposits on Candide's Forwarding Address — deterministic deposit addresses that accept tokens on any supported EVM chain and forward them to a recipient on a destination chain — through the JSON-RPC API or the WDK SDA module (@candidelabs/wdk-protocol-sda-candide). Covers architecture, the recovery wallet, address lifetime, minimums, and deposit tracking. Triggers on mentions of forwarding address, cross-chain deposit, deterministic deposit address, deposit routing, custodialWithdrawer, recoveryWithdrawer, WDK, Smart Deposit Address, SDA, or Tether wallet deposits.
---

# Forwarding Address Integration

You are helping a developer accept deposits through Candide's Forwarding Address. A forwarding address is one deterministic address that accepts deposits on every supported EVM chain, including the destination chain itself, and forwards each token to a recipient on the destination chain. The address is a self-custodial contract: the recipient can always withdraw from it, and an optional company recovery wallet can recover stuck funds after a timelock.

This skill is Candide's recommendation on how to build the integration. It deliberately leaves out method names, parameters and response shapes, which change; take those from the reference for the path you choose.

## Choose the integration path

Two paths, and the developer picks. The recommendations below apply to both.

- **JSON-RPC API**: works from any stack. Reference and changelog: https://docs.candide.dev/forwarding-address/api-reference. Integration guide: https://docs.candide.dev/forwarding-address/integration-guide. Read the changelog first; the API evolves.
- **WDK module** (`@candidelabs/wdk-protocol-sda-candide`): a JavaScript/TypeScript option for developers who prefer it. It implements Tether WDK's Smart Deposit Address interface (`SdaProtocol`), so it fits projects already built on WDK (`@tetherto/wdk*` dependencies). It derives every address client-side and checks it against the API's answer, and maps API errors onto WDK error classes. Its README is the reference and is written to be read in full: https://github.com/candidelabs/wdk-protocol-sda-candide

## Understand before building

Ask the developer, and settle these before writing code, because each one changes the design:

1. **What are you building?** A wallet, exchange, payment app, bot. This decides who holds the recovery wallet and where activation runs.
2. **Tech stack, and API or WDK module?** Offer the WDK module to JavaScript/TypeScript developers as an option, not a requirement.
3. **Does the company have a secure wallet to act as the recovery wallet?** See "Recovery wallet" below.
4. **One destination chain, or user-selected?** With one main chain, default every address to it. If users pick, the destination choices come from the supported routes, not from a hardcoded list.
5. **One address per user, or per payment?** Several addresses for the same recipient and destination need distinct salts.
6. **How long does a user keep an address?** Long-lived addresses need renewal built into the deposit screen.

Then propose the plan below for the developer's stack and get their agreement before implementing.

## Recommended architecture

**Activation runs on a backend; everything else can run anywhere.** Activating, renewing and recovering an address require the forwarding policy secret from the Candide dashboard. That secret sponsors activity under the company's policy, so it lives in a server-side secret store and never ships in a browser bundle, mobile app or other distributed binary. Reading routes, quoting, checking minimums, deriving addresses and following transfers need no secret, so a wallet client can do them directly. The usual shape: the client asks the company backend for an address, the backend activates it and returns it, and the client handles quoting and deposit tracking.

**Verify addresses before showing them.** The address is a pure function of its derivation inputs (recipient, recovery wallet, destination chain, salt, and the deployment parameters). Derive it independently and compare it with what the API returns. The WDK module does this by default. On the API path, recommend the same check, and if the two disagree, don't fund either address and escalate to Candide.

**Store the derivation inputs with the address.** Recipient, recovery wallet, destination chain and salt are needed to renew, recover or re-derive the address later. Changing any one of them produces a different address.

## Recovery wallet

The API and contracts call it `custodialWithdrawer`; the WDK module calls it `recoveryWithdrawer`.

Two parties can withdraw from a forwarding address on a source chain: the recipient, immediately, and the recovery wallet, after a timelock. A user who funds the address from an exchange, or from any wallet they don't control on that chain, cannot send the withdrawal transaction themselves. Without a separate recovery wallet, funds stuck there are unrecoverable.

| Scenario | Recovery wallet | Outcome |
|---|---|---|
| Wallet or dapp (recommended) | Company's secure wallet | Company can recover stuck funds after the timelock; the user can always withdraw immediately |
| Fully self-managed | Same as the recipient | Only the user can recover; if they can't transact on the source chain, funds are lost |
| Custodial (exchanges, neobanks) | Company's secure wallet | Company recovers on the user's behalf after the timelock |

Recommend the company wallet even when the developer describes the app as non-custodial, and explain the exchange-funding risk. Set it to the recipient only when the developer understands and accepts that tradeoff. Users with stuck funds can also use the recovery frontend: https://forwarding-address.candidelabs.com/

## Address lifetime

Monitoring is deliberately short-lived, because monitoring is what detects deposits and it costs money. An address that is not activated, or whose activation has expired, is not forwarded. A deposit that lands after expiry stays safe at the address and is forwarded once the address is renewed.

Show the expiry next to the address, and renew every time the deposit screen is opened. Renewal is idempotent and returns the new expiry, so renewing on display is cheaper and simpler than tracking expiries yourself. For a lapsed address that already holds a balance, recovery re-activates it so the next sweep picks the balance up. Recovery is a reindex: it sends no transaction and moves no funds.

## Routes, tokens and minimums

- **Read routes; never hardcode them.** Supported chains, tokens and fees come from the routes endpoint, queried per source chain. Only tokens listed for a route are forwarded; anything else sent to the address gets stuck until withdrawn.
- **Check the minimum before telling a user what to send.** Each bridge has a minimum, and a deposit below every bridge's minimum is not forwarded. Minimums move with gas and token prices, so leave a margin above the current minimum and re-check it with a quote shortly before showing it.
- **Quotes are estimates.** Present the output amount and fees as non-binding. When the company's policy sponsors fees, a quote for that specific address reflects it.
- **Amounts are integers in the token's base units.** Convert with the token's `decimals` for display, and never round-trip through floating point.

## Tracking deposits

There is no webhook. Follow deposits by polling the transfer history for the address, or for the recipient on the destination chain, and treat a delivered transfer as done; typical latency is 10 to 20 seconds. Activation status only says whether the address is being monitored, not whether a deposit arrived. Polling the recipient's balance is a fallback, not the primary signal, because it can't attribute a balance change to a deposit.

## Common mistakes

- **Shipping the policy secret to a client.** Mobile and web builds can be inspected. Activation belongs on a backend.
- **Computing an address and never activating it.** Derivation alone doesn't start monitoring.
- **Activating once and never renewing.** A long-lived address shown after expiry silently stops forwarding until it is renewed.
- **Setting the recovery wallet to the user in a "non-custodial" app.** Exchange-funded deposits then become unrecoverable.
- **Hardcoding chain IDs, token addresses or minimums.** Routes and minimums change; read them at runtime.
- **Treating activation status as delivery status.** Use the transfer history.
