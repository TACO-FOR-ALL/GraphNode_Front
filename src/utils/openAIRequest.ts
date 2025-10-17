import OpenAI from "openai";

export default async function checkAPIKeyValid(apiKey: string) {
  if (!apiKey.startsWith("sk-") || apiKey.length < 30) {
    return { ok: false, error: "invalid_key_format" };
  }

  try {
    const client = new OpenAI({ apiKey });
    await client.models.list();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: "invalid_or_revoked_key" };
  }
}
