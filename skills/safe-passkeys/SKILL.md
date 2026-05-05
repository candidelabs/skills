---
name: safe-passkeys
description: Use when integrating passkeys (WebAuthn P-256) as signers for a Safe smart account on web, React Native, or native iOS/Android. Triggers on Safe + passkeys, WebAuthn signer, biometric Safe signing, passkey recovery, RP ID setup, Associated Domains, Digital Asset Links, clientDataJSON, COSE public key, synced vs device-bound credentials, or passkey-related sign-in/recovery questions.
---

# Safe Passkeys — Best Practices

Passkeys (WebAuthn P-256) replace EOA private keys as signers for a Safe. The user authenticates with a biometric or device PIN; the on-device authenticator produces a signature the Safe contract verifies on-chain. This skill is **agnostic to the Safe variant and the ERC-4337 entrypoint version** — it works with v0.6, v0.7, and v0.9 setups, and with single-chain or multichain accounts. Paymaster flow, gas estimation, and UserOperation shape vary by entrypoint version (e.g., the commit/finalize paymaster pattern is typical of v0.9 but not v0.6/v0.7) — that orchestration is *not* this skill's concern. SDK shapes and concrete code live in the docs and the examples repo — fetch them when you write code.

## Source priority

1. **Docs** — https://docs.candide.dev/wallet/plugins/passkeys/ — authoritative for SDK version, supported chains, signature assembly helpers, recovery module wiring
2. **Examples** — https://github.com/candidelabs/abstractionkit-examples/tree/main/passkeys — minimal scripts for credential creation, signing, and account init

Do not invent SDK calls or WebAuthn parameter shapes. If a method or option is not in the docs or examples, fetch them before guessing.

## Out of scope — say so explicitly

The skill stops at the boundaries below; if the developer needs these, point them elsewhere rather than inventing.

- **Server-side WebAuthn / attestation verification.** The Safe contract verifies the signature, not the attestation. If their security model needs RP attestation, anti-phishing beyond user-presence, or backend credential registration, that is a standard WebAuthn problem — point to WebAuthn resources, not this skill.
- **UserOperation orchestration, paymaster flow, gas estimation.** All of these vary by entrypoint version (v0.6 / v0.7 / v0.9) and by single-chain vs multichain. This skill produces a signature for a given hash; the surrounding orchestration belongs to the relevant Safe / entrypoint integration skill. For multichain v0.9 specifically, hand off to `safe-unified-account`.
- **Multichain Merkle-root signing.** A passkey can sign once over a multichain Merkle root that expands per chain — but that is a v0.9-only capability, and the orchestration is `safe-unified-account`'s job. This skill stops at "produce a signature for a given hash."
- **Passkey-based recovery of another signer (delegated recovery).** Active SDK work, surface unstable. Out of scope until released.

## Discover before you code

Ask the developer all five before producing a plan or code. None are optional.

1. **Platform.** Web (browser WebAuthn), React Native, native iOS, native Android, or more than one. The credential creation API, RP-identity setup, and storage all differ. Cross-platform is its own design problem (same RP ID, multiple config files).
2. **Entrypoint version and chain count.** Which ERC-4337 entrypoint — v0.6, v0.7, or v0.9? This affects paymaster flow (commit/finalize is typical of v0.9, simpler in v0.6/v0.7), gas estimation, and how the signature is wrapped in the UserOperation. Single-chain works with any version; multichain UserOps are v0.9-only and hand off orchestration to `safe-unified-account`. The passkey signing path itself is version-agnostic — produce signatures for whatever entrypoint the developer is on.
3. **Signer topology.** 1/1 Safe with one passkey, multi-passkey owner set (one credential per device, threshold = 1), or passkey + EOA co-signer. This drives the recovery story.
4. **Recovery posture.** Native cloud sync only, recovery module from day one, multi-signer with co-signer, or some combination. A 1/1 passkey Safe without a recovery module is a funds-loss design — surface this upfront.
5. **Network.** Mainnet vs testnet. Affects bundler/paymaster endpoints, but more importantly: passkeys created against `localhost` cannot be reused on a deployed origin — get the RP ID right before users start onboarding.

## RP ID is permanent and platform-spanning

A passkey is bound to one **Relying Party ID** (a registrable domain, e.g. `app.example.com`). Choosing it well is the single most important setup-time decision.

- **Permanence.** Changing the RP ID after users have onboarded orphans every existing credential. Pick the production domain before you take real users — not a staging subdomain, not a dev domain.
- **Platform-spanning.** A user with passkeys for `app.example.com` should be able to use them on web, iOS, and Android with the *same* RP ID. Each platform has its own way to authorize this association:
  - **Web** — RP ID is a registrable suffix of the page origin. The browser enforces it.
  - **iOS** — publish `apple-app-site-association` at `https://app.example.com/.well-known/apple-app-site-association` with `webcredentials:app.example.com`, and configure Associated Domains entitlement in the app.
  - **Android** — publish Digital Asset Links at `https://app.example.com/.well-known/assetlinks.json` listing the app's package name and signing certificate SHA-256. Both debug and Play upload/app-signing certs in development.

If the same RP ID is not correctly associated on every target platform, the user gets a different credential per platform (or none) — defeating the "passkey" promise.

## Public-key extraction and storage

Credential creation returns two things:

- **`credentialId`** — opaque identifier used to ask the authenticator for *this* credential at signing time. WebAuthn-layer; never on-chain.
- **P-256 public key as `(x, y)` BigInt coordinates** — the Safe account address is deterministically derived from these. After deployment, `(x, y)` are also stored on-chain in the Safe's WebAuthn signer module.

The public key arrives in **COSE format** (CBOR-encoded inside `attestationObject.authData`). Decode it: the COSE_Key for P-256 carries `kty=2` (EC2), `alg=-7` (ES256), `crv=1` (P-256), and 32-byte big-endian unsigned integers for `x` and `y`. Use the SDK or library's helper to extract them — `ox/WebAuthnP256`, `@simplewebauthn/server`, and Candide's helpers all expose one. Hand-rolling CBOR/COSE parsing is a tedious source of off-by-one and endianness bugs; don't.

### The deploy-window risk — the asymmetry that matters

The risk of losing `(x, y)` is not constant over time:

- **Before deployment:** `(x, y)` exist *only* in client-side storage. The Safe has never been written on-chain, so its address cannot be recomputed without them. Lose `(x, y)` here and the account is unrecoverable, even if the user still has the passkey itself. **This is the dangerous window.** Persist `(x, y)` synchronously after credential creation, before any UI signals "account ready," and consider redundant storage (synced cloud entry alongside local). Treat the deploy transaction's confirmation as the boundary that closes this risk.
- **After deployment:** `(x, y)` are stored on-chain in the Safe's WebAuthn signer module. The client-side copy becomes a *cache*, not a source of truth. If the cache is lost or corrupted, re-read `(x, y)` from the deployed contract. The minimum you must never lose post-deployment is the Safe's address — from there, the on-chain copy is authoritative.

Surface this asymmetry to the developer. The instinct is to treat passkey storage as uniformly risky; in practice, all the danger is concentrated before the first successful deploy.

### Storage mechanics

**Bigints don't survive `JSON.stringify`.** `localStorage`, `AsyncStorage`, and most key-value stores serialize via JSON, which throws on bigint. Persist `(x, y)` as hex strings or decimal strings and convert on read. A subtle related bug: serializing as decimal but parsing as hex (or vice versa) silently produces a different public key, derives a different Safe address, and fails on-chain at the first signed transaction with a misleading "signature invalid" or "address mismatch" error. Pick one encoding and assert it on read.

Persist `(credentialId, x, y, safeAddress)` together. The Safe address is the post-deployment anchor — never lose it.

## Synced vs device-bound credentials — different security and recovery models

Passkeys come in two flavors. Both produce P-256 signatures the Safe verifies identically; the difference is in lifecycle.

- **Synced** (iCloud Keychain, Google Password Manager, 1Password, Dashlane) — end-to-end-encrypted in the user's cloud account. Survives device loss when the user signs into a new device with the same account. Recoverable via the cloud account's recovery flow. Most platform credentials default to synced.
- **Device-bound** (security keys, hardware authenticators, some Android configurations, `authenticatorAttachment: 'cross-platform'`-only) — never leaves the device. Lost device = lost credential.

Surface this property to the developer; it determines whether native recovery is even possible. Detect at credential creation time when the OS exposes the signal (e.g. `BS` flag in authenticator data, or platform APIs).

## Recovery — design at setup time, not after loss

This is the highest-impact decision in the integration. Get it right at setup or your users will lose funds.

### Setup-time mandate

A 1/1 Safe owned by a single passkey **must** have a recovery module (or a co-signer) enabled before the user can hold meaningful funds. Bundle the module-enable transaction with the user's first userOp; do not make it an optional settings screen users will skip. If the developer cannot commit to this, advise them to use a multi-signer topology instead (e.g. passkey on phone + passkey on laptop, threshold = 1).

### Runtime recovery hierarchy

When a user has lost access to their passkey, work the hierarchy in order:

1. **Native passkey recovery first.** If the credential was synced, the path is OS-native: sign in to the new device with the same Apple ID / Google account, the credential reappears in the system credential store, the Safe address is unchanged, no on-chain action needed. This handles the majority of consumer cases. Walk the user through the OS recovery flow before doing anything else.
2. **Recovery module / guardians second.** If the credential was device-bound, or the user lost the cloud account itself, fall back to on-chain recovery. Guardians initiate, grace period elapses, finalize swaps in a new owner. Implementation lives in the `safe-unified-account` skill's social-recovery section — defer there for the wiring.
3. **No recovery configured.** Be honest: funds are not recoverable. Do not invent a fix.

The hierarchy assumes the setup-time mandate was followed. Without it, only step 1 is available; step 2 cannot be added retroactively without the user's existing signer.

## Signature assembly — what differs from a regular WebAuthn flow

A Safe-on-chain verifier expects more than just `(r, s)`:

- The full `authenticatorData` (including flags, signCount, AAGUID for the relevant byte ranges).
- The post-challenge tail of `clientDataJSON` (everything after the `challenge` field — the verifier reconstructs the hashed clientDataJSON from challenge + this tail).
- The `(r, s)` signature, with `s` normalized to the lower half-order if the SDK requires it (check the docs).

Use the SDK's signature-assembly helper. Do not hand-roll. The fields are easy to get subtly wrong (UTF-8 vs ASCII, escaping in clientDataJSON, byte order on r/s) and the on-chain failures are unhelpful.

## clientDataJSON.origin differs by platform

- **Web** — `https://app.example.com`
- **iOS** — `https://app.example.com` (when configured via Associated Domains; the OS produces a web-origin string)
- **Android** — `android:apk-key-hash:<base64url-sha256-of-signing-cert>`

The Safe on-chain verifier hashes the full clientDataJSON and checks the signature; it does not parse origin. So origin-mismatch failures are almost always in app-side or backend allow-lists, not on-chain. If a developer reports "invalid origin," check their off-chain validation first.

## Mobile gotchas

- **Storage.** `localStorage` does not exist. Use `expo-secure-store`, `react-native-keychain`, or the OS keystore. Store only the `credentialId` and public-key coordinates — the private key never leaves the authenticator.
- **Library variation.** `react-native-passkey`, `expo-passkeys`, `react-native-webauthn`, native bridge modules — APIs differ, and feature coverage differs (resident keys, user verification options, conditional UI). Confirm the developer's choice before suggesting code shapes.
- **Hybrid transport / cross-device.** Sign in on a new mobile device by scanning a QR from a desktop where the credential lives — supported by both ecosystems but UX-dense. Treat as a separate design surface; don't pile it onto a first integration.

## Verification before claiming done

Inspecting the credential creation code is not enough. Exercise the full lifecycle:

- Create a passkey on the production-equivalent RP ID (not localhost) and sign a transaction.
- Test on every platform the developer claims to support — web + iOS + Android each have their own RP-association failure modes.
- Test the recovery path. For synced credentials: actually wipe the device or sign in on a fresh one. For device-bound: actually run the recovery module flow with at least one guardian.
- Test "user has no recovery configured" as a UX state — the app should make this visible, not hide it.

## Red flags

| Symptom | Stop and do this |
|---------|------------------|
| About to scaffold code without answering the five discovery questions | Ask first. Platform and signer topology change everything. |
| 1/1 passkey Safe without a recovery module | Refuse to ship without one, or switch to multi-signer. Surface as a design defect, not a TODO. |
| Recommending native recovery for a device-bound credential | It does not work. Go to the recovery module. |
| About to invent or guess an SDK signature-assembly helper | Fetch the docs. Hand-rolled WebAuthn signature data fails on-chain in unhelpful ways. |
| Picking a WebAuthn library for the developer | Surface the choices (ox, simplewebauthn, native APIs) and let them decide. |
| Treating localhost RP ID as production-ready | Get the production domain locked before users onboard. Credentials do not migrate. |
| Telling a user with no recovery configured that funds can be restored | They cannot. Be honest. |
| About to hand-write multichain orchestration | This skill stops at "produce a signature." Hand off to `safe-unified-account`. |
