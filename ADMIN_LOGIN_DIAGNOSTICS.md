# Admin login diagnostics — 2026-11-02

The old login endpoint used one 401 response for both missing configuration and an incorrect password. This prevented distinguishing a hosting configuration problem from a failed credential check. The password input also lacked an explicit border after the global CSS reset.

The new runtime GET returns only `missing`, `invalid` or `ready`, never the key, length or fingerprint. POST distinguishes configuration unavailability (503), credential mismatch (401), and rejected origin (403). Server rejection logs contain only a fixed error code and HTTP status; requests, passwords and cookies are never logged. A successful login is followed by a browser session check. Network failures are handled explicitly.

The login field now has a two-pixel contrasting border, a visible keyboard-focus ring, a 52px minimum height and an associated label/help text. Submit is disabled while waiting. Leading/trailing input whitespace prompts correction; credentials are never silently rewritten.

A real production success check still requires the operator to enter their secret in the browser. The agent does not read the secret, substitute a temporary production password, or claim access to Netlify's private logs without authorization/access.

CI 41406058495 passed lint, typecheck, all tests, production build and HTTP smoke before release. Local lint/typecheck/build and four maintenance tests also passed.

Production verification at 2026-11-02 07:29 UTC: deployed commit addccc24309eaa9d711dddf90ea4488c40112c23; release CI 41407616877 succeeded. GET /api/admin returned 200 and configuration=ready (runtime key exists and meets the minimum length). An intentionally wrong diagnostic password returned 401 ADMIN_KEY_MISMATCH; this is not evidence about the operator's actual password. /admin returned 200 and its deployed stylesheet contains the password border and focus rules. Actual operator login is pending. Private Netlify logs were not accessible. Headless screenshot execution was blocked by automatic policy; no screenshot-based visual claim is made.
