import { json, getBaseUrl, missing, getAccessToken } from "./_utils.js";

function timestampNow() {
  // Daraja timestamps are normally expressed in Kenya local time (EAT).
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second}`;
}

export async function onRequestPost({ request, env }) {
  let input;
  try { input = await request.json(); }
  catch { return json({ ok: false, error: "Request body must be valid JSON." }, 400); }

  const phone = String(input.phone || "").replace(/\D/g, "");
  const amount = Number(input.amount);
  const accountReference = String(input.accountReference || "DarajaLab").trim();
  const transactionDesc = String(input.transactionDesc || "Sandbox test").trim();

  if (!/^254[17]\d{8}$/.test(phone)) {
    return json({ ok: false, error: "Phone must be a Kenyan mobile number in 2547XXXXXXXX or 2541XXXXXXXX format." }, 400);
  }
  if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
    return json({ ok: false, error: "Amount must be a whole number from 1 to 150000." }, 400);
  }
  if (!accountReference || accountReference.length > 12 || !transactionDesc || transactionDesc.length > 13) {
    return json({ ok: false, error: "Account reference must be 1–12 characters and description 1–13 characters." }, 400);
  }
  const absent = missing(env, ["DARAJA_SHORTCODE", "DARAJA_PASSKEY"]);
  if (absent.length) {
    return json({ ok: false, error: `Missing Cloudflare secret(s): ${absent.join(", ")}` }, 500);
  }

  try {
    const token = await getAccessToken(env);
    const timestamp = timestampNow();
    const password = btoa(`${env.DARAJA_SHORTCODE}${env.DARAJA_PASSKEY}${timestamp}`);
    const callbackUrl = env.DARAJA_CALLBACK_URL || new URL("/api/callback", request.url).toString();
    const payload = {
      BusinessShortCode: env.DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: env.DARAJA_STK_TYPE || "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: env.DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc
    };
    const response = await fetch(`${getBaseUrl(env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    return json({
      ok: response.ok && !data.errorCode,
      http_status: response.status,
      message: response.ok ? "Request sent to Daraja sandbox. Check the response and callback." : "Daraja sandbox returned an error.",
      response: data
    }, response.ok ? 200 : (response.status >= 400 && response.status < 600 ? response.status : 502));
  } catch (error) {
    return json({
      ok: false,
      error: error.message || "STK Push request failed.",
      details: error.details || undefined
    }, error.status || 502);
  }
}
