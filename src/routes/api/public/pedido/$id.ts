import { createFileRoute } from "@tanstack/react-router";
import { getProduto } from "@/lib/loja/produtos";

export const Route = createFileRoute("/api/public/pedido/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { db, reconciliar } = await import("@/lib/loja/pedidos.server");
        if (!/^[0-9a-f-]{36}$/i.test(params.id)) return Response.json({ erro: "Pedido não encontrado." }, { status: 404 });
        const s = await db();
        let { data: p } = await s.from("pedidos").select("id, produto, valor, status, txid, ultima_consulta").eq("id", params.id).maybeSingle();
        if (!p) return Response.json({ erro: "Pedido não encontrado." }, { status: 404 });
        // consulta a SmokePay no máximo a cada 10 s por pedido
        if (p.status === "pending" && p.txid && (!p.ultima_consulta || Date.now() - new Date(p.ultima_consulta).getTime() > 10000)) {
          await s.from("pedidos").update({ ultima_consulta: new Date().toISOString() }).eq("id", p.id);
          try { await reconciliar({ id: p.id, valor: Number(p.valor) }); } catch (e: any) { console.error("[status]", p.id, e.status || e.message); }
          const again = await s.from("pedidos").select("id, produto, valor, status, txid, ultima_consulta").eq("id", p.id).single();
          if (again.data) p = again.data;
        }
        const out: Record<string, string> = { status: p.status };
        const prod = getProduto(p.produto);
        if (p.status === "paid" && prod) { out["produto"] = prod.nome; out["entrega"] = prod.entrega; }
        return Response.json(out);
      },
    },
  },
});
