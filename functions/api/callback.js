import { json } from "./_utils.js";

// Minimal callback receiver for sandbox diagnostics.
// Cloudflare isolates are ephemeral: this does not provide durable callback history.
export async function onRequestPost({ request }) {
  let body;
  try { body = await request.json(); }
  catch { return json({ ResultCode: 0, ResultDesc: "Accepted" }); }

  // Avoid logging customer data or credentials. Callback content is returned nowhere.
  // For persistent debugging, add a database (e.g. D1) and store only necessary fields.
  return json({
    ResultCode: 0,
    ResultDesc: "Accepted",
    received: true,
    callbackType: body?.Body?.stkCallback ? "stkCallback" : "unknown"
  });
}

export async function onRequestGet() {
  return json({ ok: true, endpoint: "Daraja callback receiver", method: "POST expected" });
}
