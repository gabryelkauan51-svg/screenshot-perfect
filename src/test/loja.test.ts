import { describe, it, expect } from "vitest";
import { PRODUTOS } from "@/lib/loja/produtos";
import { assinaturaValida } from "@/lib/loja/smokepay.server";

async function assinar(t: string, raw: string, secret: string) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(`${t}.${raw}`));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

describe("loja", () => {
  it("preços do servidor", () => {
    expect(PRODUTOS.cpa.preco).toBe(99.99);
    expect(PRODUTOS.sites.preco).toBe(19.99);
    expect(PRODUTOS.vip.preco).toBe(49.99);
    expect(PRODUTOS.ia.preco).toBe(15.99);
  });
  it("aceita assinatura válida", async () => {
    const t = String(Math.floor(Date.now() / 1000)); const raw = '{"a":1}';
    expect(await assinaturaValida(raw, `t=${t},v1=${await assinar(t, raw, "s")}`, "s")).toBe(true);
  });
  it("recusa corpo adulterado", async () => {
    const t = String(Math.floor(Date.now() / 1000));
    expect(await assinaturaValida('{"a":2}', `t=${t},v1=${await assinar(t, '{"a":1}', "s")}`, "s")).toBe(false);
  });
  it("recusa assinatura com mais de 10 min", async () => {
    const t = String(Math.floor(Date.now() / 1000) - 700); const raw = "{}";
    expect(await assinaturaValida(raw, `t=${t},v1=${await assinar(t, raw, "s")}`, "s")).toBe(false);
  });
});
