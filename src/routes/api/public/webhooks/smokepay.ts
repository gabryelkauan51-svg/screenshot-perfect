import { createFileRoute } from "@tanstack/react-router";
import { igual } from "@/lib/loja/produtos";

export const Route = createFileRoute("/api/public/webhooks/smokepay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { assinaturaValida } = await import("@/lib/loja/smokepay.server");
        const { db, marcarPago } = await import("@/lib/loja/pedidos.server");
        const secret = process.env.SMOKEPAY_WEBHOOK_SECRET;
        const raw = await request.text();
        if (!secret || raw.length > 100_000 || !(await assinaturaValida(raw, request.headers.get("x-webhook-signature"), secret))) {
          return new Response(null, { status: 401 });
        }
        let ev: any;
        try { ev = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
        if (ev.event !== "payment.confirmed") return new Response(null, { status: 200 });
        if (typeof ev.external_id !== "string" || !/^[0-9a-f-]{36}$/i.test(ev.external_id)) return new Response(null, { status: 200 });
        const s = await db();
        const { data: p } = await s.from("pedidos").select("id, valor").eq("id", ev.external_id).maybeSingle();
        if (!p) { console.warn("[webhook] pedido desconhecido", ev.external_id); return new Response(null, { status: 200 }); }
        if (ev.status === "paid" && igual(ev.amount, p.valor)) await marcarPago(p.id);
        else console.error("[webhook] dados não batem", ev.external_id, ev.status, ev.amount);
        return new Response(null, { status: 200 });
      },
    },
  },
});
