# Daraja Lab — Safaricom Daraja Sandbox

A responsive liquid-glass-style (solid surfaces, no gradients) Daraja API testing dashboard for Cloudflare Pages + GitHub.

## Features
- Server-side OAuth token test
- Sandbox STK Push initiation
- Callback endpoint with recent callback records in memory per isolate (best-effort diagnostics only)
- Response inspector and browser-side request history
- Mobile-friendly light/dark theme

## Important
This is a **sandbox testing tool**, not a production payment system. Use only Safaricom sandbox credentials and test numbers. Do not collect real customer credentials or use production credentials in this starter project.

Cloudflare Pages Functions keep API credentials server-side. Set these secrets in **Cloudflare Dashboard → Workers & Pages → your Pages project → Settings → Variables and Secrets**:
- `DARAJA_CONSUMER_KEY`
- `DARAJA_CONSUMER_SECRET`
- `DARAJA_SHORTCODE` (sandbox shortcode, commonly `174379`; use the value shown in your Daraja app)
- `DARAJA_PASSKEY` (sandbox passkey from the Daraja app)
- `DARAJA_CALLBACK_URL` (optional; if omitted, the app uses `/api/callback` on the deployed site)

Set ordinary variables:
- `DARAJA_BASE_URL` = `https://sandbox.safaricom.co.ke`
- `DARAJA_STK_TYPE` = `CustomerPayBillOnline`

## Deploy with GitHub and Cloudflare Pages (phone-friendly)
1. Create a GitHub repository, e.g. `daraja-lab`.
2. Upload all files and folders from this ZIP into the repository root. Ensure `public/index.html` and `functions/api/stkpush.js` retain their paths.
3. In Cloudflare Dashboard, open **Workers & Pages → Create → Pages → Connect to Git** and select the repository.
4. Build settings:
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `public`
5. Deploy.
6. In the Pages project settings, add the variables/secrets listed above. Mark consumer key, consumer secret and passkey as secrets.
7. Redeploy after adding variables if required by the dashboard.
8. Open the deployed URL and use **Connection test** first, then try an STK Push with a sandbox test phone number.

## Callback URL
Set `DARAJA_CALLBACK_URL` to your deployed URL plus `/api/callback`, e.g. `https://YOUR-PROJECT.pages.dev/api/callback`. Add this URL in the Daraja app if its configuration asks for a callback URL. Callback delivery depends on Safaricom sandbox behavior and configuration.

## Notes
- Safaricom's sandbox behavior, required fields, supported test numbers, and callback delivery can vary by API/product and app configuration. Follow the current Daraja portal documentation.
- STK Push requires a valid sandbox shortcode, passkey, timestamp, access token and accepted request parameters.
- Browser history is stored only in that browser's localStorage. Server callback records in this starter are temporary and not durable across isolates/restarts; use a database for persistent logs.
- The callback endpoint returns the standard acknowledgement shape and does not verify payment settlement. Never treat a callback alone as proof of payment in a production app.
- This starter intentionally does not include B2C transfers, withdrawals, or live payment processing.
