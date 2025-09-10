// api/momoPay.js
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { phone, amount, reference } = req.body;

  const SUB_KEY = process.env.SUB_KEY;
  const AUTH_HEADER = process.env.AUTH_HEADER;
  const MOMO_ENV = process.env.MOMO_ENV || "mtnsouthafrica"; // or "sandbox"

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

    // Step 2: Send Payment Request
    const txnId = uuidv4();
    const momoRes = await fetch("https://proxy.momoapi.mtn.com/collection/v1_0/requesttopay", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "X-Reference-Id": txnId,
        "X-Target-Environment": MOMO_ENV,
        "Ocp-Apim-Subscription-Key": SUB_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        currency: "ZAR",
        externalId: reference || "empowa",
        payer: { partyIdType: "MSISDN", partyId: phone },
        payerMessage: "Payment via EMPOWA",
        payeeNote: reference || "Payment"
      })
    });

    if (momoRes.status === 202) {
      return res.status(200).json({ txnId, status: "pending" });
    } else {
      const error = await momoRes.text();
      return res.status(momoRes.status).send(error);
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
