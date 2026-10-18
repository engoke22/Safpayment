export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  }
});

export function getBaseUrl(env) {
  return (env.DARAJA_BASE_URL || "https://sandbox.safaricom.co.ke").replace(/\/+$/, "");
}

export function missing(env, keys) {
  return keys.filter((key) => !env[key] || !String(env[key]).trim());
}

export async function getAccessToken(env) {
  const absent = missing(env, ["DARAJA_CONSUMER_KEY", "DARAJA_CONSUMER_SECRET"]);
  if (absent.length) {
    const error = new Error(`Missing Cloudflare secret(s): ${absent.join(", ")}`);
    error.status = 500;
    throw error;
  }
  const credentials = btoa(`${env.DARAJA_CONSUMER_KEY}:${env.DARAJA_CONSUMER_SECRET}`);
  const response = await fetch(`${getBaseUrl(env)}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" }
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw }; }
  if (!response.ok || !data.access_token) {
    const error = new Error("Daraja OAuth token request failed.");
    error.status = response.status || 502;
    error.details = data;
    throw error;
  }
  return data.access_token;
}
