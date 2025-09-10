// api/momoStatus.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
  }

  const { txnId } = req.query;
  if (!txnId) {
    return res.status(400).json({ error: "Missing txnId parameter" });
  }

  const SUB_KEY = process.env.SUB_KEY;
  const AUTH_HEADER = process.env.AUTH_HEADER;
  const MOMO_ENV = process.env.MOMO_ENV || "mtnsouthafrica";

  try {
    // Step 1: Get Access Token
    const tokenRes = await fetch("https://proxy.momoapi.mtn.com/collection/token/", {
      method: "POST",
      headers: {
        Authorization: AUTH_HEADER,
        "Ocp-Apim-Subscription-Key": SUB_KEY,
        "X-Target-Environment": MOMO_ENV,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    if (!access_token) {
      return res.status(401).json({ error: "Failed to get access token", details: tokenData });
    }

    // Step 2: Check payment status
    const momoRes = await fetch(
      `https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay/${txnId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "X-Target-Environment": MOMO_ENV,
          "Ocp-Apim-Subscription-Key": SUB_KEY,
        }
      }
    );

    const statusData = await momoRes.json();
    return res.status(200).json(statusData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
