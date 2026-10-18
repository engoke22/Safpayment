import { json, getAccessToken } from "./_utils.js";

export async function onRequestPost({ env }) {
  try {
    const token = await getAccessToken(env);
    // Token is returned only for the developer's explicit diagnostic request.
    return json({ ok: true, message: "OAuth token request successful.", access_token: token });
  } catch (error) {
    return json({
      ok: false,
      error: error.message || "Unable to request an access token.",
      details: error.details || undefined
    }, error.status || 502);
  }
}
