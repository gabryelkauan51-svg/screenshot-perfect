const BASE = "https://smokepay.com.br";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const backoff = (i: number) => Math.min(1000 * 2 ** i, 8000) + Math.random() * 300;
export class SmokeError extends Error {
  constructor(public status: number, public data: unknown) { super(`SmokePay ${status}`); }
}

// Repete só o que é temporário. A criação é segura de repetir porque usa external_id.
export async function smoke(method: string, path: string, body?: unknown): Promise<any> {
  const key = process.env.SMOKEPAY_API_KEY;
  if (!key) throw new SmokeError(401, "SMOKEPAY_API_KEY ausente");
  const MAX = 4;
  for (let i = 0; i < MAX; i++) {
    let res: Response;
    try {
      res = await fetch(BASE + path, {
        method,
        headers: { "x-api-key": key, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
    } catch (e) {
      if (i === MAX - 1) throw new SmokeError(504, String(e));
      await sleep(backoff(i));
      continue;
    }
    const texto = await res.text();
    let data: any;
    try { data = JSON.parse(texto); } catch { data = { raw: texto }; }
    if (res.ok) return data;
    if ([429, 500, 502, 503].includes(res.status) && i < MAX - 1) {
      const ra = Number(res.headers.get("retry-after")) * 1000;
      await sleep(ra > 0 ? Math.min(ra, 15000) : backoff(i));
      continue;
    }
    throw new SmokeError(res.status, data);
  }
  throw new SmokeError(504, "sem resposta");
}

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function assinaturaValida(raw: string, header: string | null, secret: string, agora = Date.now()) {
  if (!header) return false;
  const partes: Record<string, string> = {};
  for (const s of header.split(",")) {
    const i = s.indexOf("=");
    if (i > 0) partes[s.slice(0, i).trim()] = s.slice(i + 1).trim();
  }
  const { t, v1 } = partes;
  if (!t || !v1 || !/^\d+$/.test(t) || !/^[0-9a-f]+$/i.test(v1)) return false;
  if (Math.abs(agora / 1000 - Number(t)) > 600) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const esperado = hex(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${raw}`)));
  const recebido = v1.toLowerCase();
  if (recebido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return diff === 0;
}
