import { isHttpsWebhookUrl, usableSenderKey } from "@/lib/bot-wake";

export const BOT_WAKE_URL_SECRET = "BOT_WAKE_WEBHOOK_URL";
export const BOT_WAKE_KEY_SECRET = "BOT_WAKE_WEBHOOK_KEY";
export const WORKER_SCRIPT_NAME = "bot-my-meals";

export const BOT_WAKE_SAVE_UNAVAILABLE =
  "Could not store that on the Worker. Set the secret BOT_WAKE_WEBHOOK_URL (and BOT_WAKE_WEBHOOK_KEY if the routine shows a key). To save from House, also set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN on the Worker.";

export const BOT_WAKE_SAVE_FAILED = "Could not store that on the Worker.";
export const BOT_WAKE_URL_INVALID = "Paste an https webhook URL.";

type SecretText = { name: string; text: string; type: "secret_text" };

let rememberedUrl: string | null = null;
let rememberedKey: string | null | undefined;

export function resetRememberedBotWakeSecrets(): void {
  rememberedUrl = null;
  rememberedKey = undefined;
}

export function rememberBotWakeSecrets(url: string, key: string | undefined): void {
  rememberedUrl = url;
  if (key !== undefined) rememberedKey = key;
}

export function readBotWakeSecrets(env: NodeJS.ProcessEnv = process.env): {
  url: string | null;
  key: string | null;
  configured: boolean;
} {
  const url = (rememberedUrl ?? env[BOT_WAKE_URL_SECRET] ?? "").trim();
  const rawKey = rememberedKey !== undefined ? rememberedKey : (env[BOT_WAKE_KEY_SECRET] ?? "");
  const configured = isHttpsWebhookUrl(url);
  return {
    url: configured ? url : null,
    key: usableSenderKey(rawKey),
    configured,
  };
}

function canWriteSecrets(env: NodeJS.ProcessEnv): { accountId: string; token: string } | null {
  const accountId = (env.CLOUDFLARE_ACCOUNT_ID ?? "").trim();
  const token = (env.CLOUDFLARE_API_TOKEN ?? "").trim();
  if (!/^[a-f0-9]{32}$/i.test(accountId)) return null;
  if (!token || /\s/.test(token)) return null;
  return { accountId, token };
}

export async function saveBotWakeSecrets(input: {
  url: string;
  key?: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = input.url.trim();
  if (!isHttpsWebhookUrl(url)) return { ok: false, error: BOT_WAKE_URL_INVALID };

  let key: string | undefined;
  if (input.key !== undefined && input.key.trim()) {
    const usable = usableSenderKey(input.key);
    if (!usable) return { ok: false, error: "That sender key cannot be stored." };
    key = usable;
  }

  const env = input.env ?? process.env;
  const creds = canWriteSecrets(env);
  if (!creds) {
    if (env.NODE_ENV === "production") return { ok: false, error: BOT_WAKE_SAVE_UNAVAILABLE };
    rememberBotWakeSecrets(url, key);
    return { ok: true };
  }

  const secrets: Record<string, SecretText> = {
    [BOT_WAKE_URL_SECRET]: { name: BOT_WAKE_URL_SECRET, text: url, type: "secret_text" },
  };
  if (key) {
    secrets[BOT_WAKE_KEY_SECRET] = { name: BOT_WAKE_KEY_SECRET, text: key, type: "secret_text" };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(
      `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/workers/scripts/${WORKER_SCRIPT_NAME}/secrets-bulk`,
      {
        method: "PATCH",
        headers: {
          authorization: `Bearer ${creds.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ secrets }),
        redirect: "manual",
      },
    );
    const payload: unknown = await response.json().catch(() => null);
    const success =
      response.ok &&
      payload != null &&
      typeof payload === "object" &&
      "success" in payload &&
      (payload as { success: unknown }).success === true;
    if (!success) return { ok: false, error: BOT_WAKE_SAVE_FAILED };
  } catch {
    return { ok: false, error: BOT_WAKE_SAVE_FAILED };
  }

  rememberBotWakeSecrets(url, key);
  return { ok: true };
}
