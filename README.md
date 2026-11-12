# Daonmarkets Public Website

React / Express / tRPC / Drizzle application with Clerk email authentication, explicit Manus rollback support, and request-only USDT operations.

## Commands

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations; review additive SQL before execution.
- `pnpm db:push`: generate and apply schema changes; prefer separate reviewed generation and migration.
- `pnpm check` / `pnpm test`: TypeScript and isolated application tests.

The managed development and production database is shared. Do not create financial fixtures, fake users, or live approval decisions while testing. Tests use in-memory mock contexts and database adapters, not live sessions.

## Authentication and account roles

The approved default is `AUTH_PROVIDER=clerk`. `/login` and `/signup` render Korean-localized Clerk UI when the owner's Clerk keys are configured. Clerk verifies the provider session and primary email before the server resolves a DB user. Each API request obtains a current Bearer token. Missing keys show an honest preparation state; the application never falls back to Manus sessions or fabricated accounts. Successful authentication directs the member to `/member/services`. Logout revokes the Clerk session and removes private client caches.

`AUTH_PROVIDER=manus` is an explicit rollback only. In that mode `/api/oauth/callback` validates the single-use state nonce, synchronizes the real Manus identity, and issues `webdev_app_session`. This callback is not registered in Clerk mode. Existing Manus cookies do not authenticate Clerk requests.

Ordinary authenticated accounts have the `user` role. `/admin/finance` and every operator API require the `admin` role from the server-resolved user record. The application has no public or member endpoint for granting roles and no development authentication bypass. A missing admin role must not be treated as a login failure or bypassed in Preview.

An operator account must be assigned in a separate authorized provisioning step after its real identity is verified. Do not grant admin to the first signup or every project visitor. Clerk accounts use a deterministic `clerk:` identity and never merge with Manus accounts just because the emails match. New Clerk accounts use the DB's normal-user default; existing DB roles are preserved. Clerk metadata and `OWNER_OPEN_ID` do not grant Clerk roles. No account was promoted during this implementation. The inherited trusted owner mapping is limited to explicit Manus rollback.

## Member request workflow

`/member` accepts USDT deposit and withdrawal requests on TRC20, ERC20, or BEP20. Creation APIs always take ownership from `ctx.user.id` and store `PENDING`. Member list APIs filter by the same authenticated ID.

Amounts are decimal strings constrained to `decimal(20,8)`: positive, at most 12 integer digits and 8 fractional digits. A TRC20 withdrawal address must have the basic `T` + 33 Base58 character shape; ERC20/BEP20 addresses must have the `0x` + 40 hexadecimal character shape. An optional transaction hash is 64 hexadecimal characters for TRC20 or `0x` + 64 hexadecimal characters for ERC20/BEP20. These checks do not prove address checksum, ownership, actual network, or the existence or confirmation of a blockchain transaction.

Members can refresh their own request history and see the review status, member-visible reason, and updated timestamp. Loading, query failures, and a truly empty history are distinct UI states.

## Operator review workflow

`/admin/finance` provides type/status filters, paginated requests, a selected request inspector, and review history. It shows member identity, submitted amount/network, hash or address, and timestamps. Operators enter a 3–1,000-character trimmed public reason and confirm the decision before submission. Never put internal credentials or private investigation details in that reason.

Only `PENDING → APPROVED` or `PENDING → REJECTED` is allowed. Request updates and the immutable application review log are stored in one database transaction. Conditional updates prevent two operators from reviewing the same pending request twice. Already processed requests cannot be reset or re-reviewed through this interface.

`admin.finance.list`, `admin.finance.review`, and `admin.finance.audit` are role-gated on the server. Review actors come from the authenticated context, not from client input. The `finance_request_reviews` table stores request kind/ID, reviewer, before/after status, reason, and timestamp. Its records have no edit/delete API.

**APPROVED means review approved only. It is not an on-chain deposit confirmation, a balance credit/debit, or a completed withdrawal.** The review feature does not call a blockchain, issue a wallet, calculate a balance, or move funds.

## Remaining work and publication

Wallet configuration, balance ledger, blockchain confirmation, limits/fees, settlement, and actual funds movement remain separate later capabilities. Member access review, notices/materials/tickets, and their operator interfaces are connected in the current code, but still need actual account end-to-end validation after the external authentication blocker is resolved. Do not transfer real funds through this request prototype.

Earlier Manus publication was rejected with `publish_rejected`, including after storing `hosting.mode=on_demand`. Saving code or an additive migration is not publication success. Clerk integration and external deployment preparation are implemented, but actual provider keys, independent DB provisioning/migration, public Render deployment, and domain HTTPS are not yet completed.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. Managed `/manus-storage/` assets use the platform route rather than a second application proxy. Existing `app.config.ts` branding is preserved.

## Member services and operations home

`/member/services` provides authenticated service-access applications, announcements/read marks, approval-gated text materials, and member-owned support tickets/replies. Service access approval is separate from the `admin` role. It allows published material access but does not grant administrative power or enable funds movement. An authenticated member can submit financial review requests independently of material-access approval.

`/admin` manages pending applications, public/member announcements, materials, and support tickets and displays genuine pending counts. Application reviews only finalize PENDING once. Published public notices appear at `/notices`; hidden and member-only notices never appear in public HTML/API responses. Ticket replies are appended with their real server-resolved author role/ID; CLOSED tickets cannot receive replies. No demo accounts, notices, materials, tickets, or financial requests were seeded.

Public home/help/notices have content-bearing initial HTML, route-specific metadata, and true missing-route status responses. Private routes are noindex/no-store. `PUBLIC_SITE_URL` must be set to the confirmed public origin after publication/domain setup; until then canonical/sitemap output is intentionally omitted and the production robots response disallows indexing. The application does not infer public origin from an internal Host header.

## Current external launch blockers (observed 2026-11-10)

The latest manual publication request for saved version `136d5e6` returned `publish_rejected` (`wdo_41d3f0d13d0958e746224195`). The actual Manus OAuth authorization page returned `Permission denied / [not_found] project not found`. Running public OAuth config matches the refreshed platform environment, so an arbitrary client-ID substitution or fabricated login is not an acceptable repair. No real end-to-end account/role workflow has been completed.

`daonmarkets.com` is registered with Cloudflare, Inc., with Cloudflare nameservers. The registry source is https://rdap.verisign.com/com/v1/domain/daonmarkets.com (checked 2026-11-10). Direct A/AAAA lookup for the apex returned no address; www lookup failed. This is not evidence that the domain is unregistered. DNS changes require access to the owner’s Cloudflare zone and a confirmed published destination. No nameserver, DNS, billing, or domain registration changes were made.

The running development service was restarted with the current managed DB environment after an obsolete process environment produced `Portal database is unavailable`. Public announcements now respond HTTP 200 with a genuine empty list. Member access/material/ticket and admin summary queries without a session respond HTTP 401. Additive portal tables are present and empty. This is read-only connectivity evidence, not proof of successful login or operation of a real financial service.

## External deployment preparation — 2026-11-10

Cloudflare, Render, and GitHub account connections were verified. The GitHub account is `luis3837ss-bot`; no deployment repository has yet been created. Use the managed owner-confirmed private-repository flow rather than silently rewriting the original remote. Preserve the existing project and DB until the transition is verified.

`render.yaml` declares a free Docker validation service in Singapore with auto-deploy off. `Dockerfile` installs the pinned lockfile and builds without credentials. `.dockerignore` excludes environment files, Clerk claims, keys, certificates, and database exports. A paid server or database must not be created until its actual billing terms are approved. Free/developer tiers are for validation, not a claim of production-grade financial availability.

External runtime uses the owner's `CLERK_PUBLISHABLE_KEY`, server-only `CLERK_SECRET_KEY`, and an explicit `CLERK_ALLOWED_ORIGINS` list including the assigned Render HTTPS origin. Production requires an explicit HTTPS origin list and never substitutes the old Preview/localhost list. Missing or invalid origins do not report auth as configured; supplying both keys without valid production origins fails startup. Never derive token trust from an unverified request Host or paste keys into Git/chat. `EXTERNAL_DATABASE_URL` and optional `EXTERNAL_DATABASE_CA` select a user-owned MySQL destination separately from the existing managed `DATABASE_URL`. Production Clerk DB access fails closed when the independent DSN is missing, even if a managed DSN is present. TLS certificate validation stays enabled. `pnpm db:migrate:external` refuses to use managed `DATABASE_URL`, applies reviewed checked-in migrations, closes its pool, and seeds no accounts or financial records.

Validation after middleware integration and read-only audit fixes: TypeScript passed, 67 isolated tests passed, and production build passed. Public configuration shows `authProvider: clerk` and `authConfigured: false` until keys and trusted origins are supplied; anonymous finance API returns HTTP401. These checks do not establish a real email signup, an admin account, or a successful public deployment. No external MySQL connection or customer-data export was performed. Cloudflare identity connection works, but the domain-query execution returned `insufficient_scope`; domain/DNS permission still needs a narrow reauthorization before actual address changes.
