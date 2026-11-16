import { getProduto, igual } from "./produtos";
import { smoke } from "./smokepay.server";

export async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function marcarPago(id: string) {
  const s = await db();
  // idempotente: só muda se ainda não estiver pago
  const { data } = await s.from("pedidos").update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id).neq("status", "paid").select("id, produto, email");
  if (data?.length) console.log(`[pago] pedido ${id} · ${getProduto(data[0].produto)?.nome} · ${data[0].email}`);
}

export async function reconciliar(p: { id: string; valor: number }) {
  const r = await smoke("GET", "/api/pix/" + encodeURIComponent(p.id));
  const d = r.transaction || r;
  if (d.status === "paid") {
    if (!igual(d.amount, p.valor)) { console.error("[valor divergente]", p.id, d.amount, p.valor); return; }
    await marcarPago(p.id);
  } else if (d.status === "expired" || d.status === "cancelled") {
    const s = await db();
    await s.from("pedidos").update({ status: d.status }).eq("id", p.id).eq("status", "pending");
  }
}
