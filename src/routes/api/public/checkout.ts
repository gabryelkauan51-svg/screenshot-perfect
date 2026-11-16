import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PRODUTOS } from "@/lib/loja/produtos";

const Body = z.object({
  produto: z.string().max(20),
  nome: z.string().trim().min(3).max(120),
  email: z.string().trim().email().max(160),
  whatsapp: z.string().max(30),
});
const erro = (status: number, msg: string) => Response.json({ erro: msg }, { status });

export const Route = createFileRoute("/api/public/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { db } = await import("@/lib/loja/pedidos.server");
        const { smoke } = await import("@/lib/loja/smokepay.server");
        let json: unknown;
        try { json = await request.json(); } catch { return erro(400, "Dados inválidos."); }
        const parsed = Body.safeParse(json);
        if (!parsed.success) {
          const campo = parsed.error.issues[0]?.path[0];
          return erro(400, campo === "email" ? "E-mail inválido." : campo === "nome" ? "Nome inválido." : "Dados inválidos.");
        }
        const { produto, nome, email } = parsed.data;
        const prod = PRODUTOS[produto];
        if (!prod) return erro(400, "Produto inválido.");
        const fone = parsed.data.whatsapp.replace(/\D/g, "");
        if (fone.length < 10 || fone.length > 13) return erro(400, "WhatsApp inválido.");

        const s = await db();
        const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "?";
        const { count } = await s.from("pedidos").select("id", { count: "exact", head: true })
          .eq("ip", ip).gte("criado", new Date(Date.now() - 60000).toISOString());
        if ((count ?? 0) >= 8) return erro(429, "Muitas tentativas. Aguarde um minuto.");

        const { data: pedido, error } = await s.from("pedidos").insert({
          produto, nome, email: email.toLowerCase(), whatsapp: fone, valor: prod.preco, ip,
        }).select("id").single();
        if (error || !pedido) { console.error("[checkout db]", error); return erro(503, "Pagamento indisponível agora. Tente novamente em instantes."); }
        const id = pedido.id;

        try {
          const origin = new URL(request.url).origin;
          const r = await smoke("POST", "/api/pix/create", {
            amount: prod.preco,
            description: `Pedido ${id.slice(0, 8)}`,
            external_id: id,
            webhook_url: `${origin}/api/public/webhooks/smokepay`,
            expiration: 1800,
          });
          const t = r.transaction;
          await s.from("pedidos").update({ txid: t.txid, expires_at: t.expires_at, pix: t.pix_copia_cola }).eq("id", id);
          return Response.json({
            pedido_id: id, valor: prod.preco, expires_at: t.expires_at,
            pix_copia_cola: t.pix_copia_cola, qr_code_base64: t.qr_code_base64,
          });
        } catch (e: any) {
          console.error("[checkout]", e.status, JSON.stringify(e.data ?? e.message));
          await s.from("pedidos").update({ status: "erro" }).eq("id", id);
          if (e.status === 400) return erro(400, "Não foi possível gerar o Pix para este pedido.");
          if (e.status === 401) return erro(500, "Erro de configuração do pagamento.");
          return erro(503, "Pagamento indisponível agora. Tente novamente em instantes.");
        }
      },
    },
  },
});
