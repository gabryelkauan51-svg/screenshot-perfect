import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GBOY X7 — Loja" },
      { name: "description", content: "Cursos e mentorias GBOY X7 com pagamento via Pix." },
      { property: "og:title", content: "GBOY X7 — Loja" },
      { property: "og:description", content: "Cursos e mentorias GBOY X7 com pagamento via Pix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <iframe src="/loja.html" title="GBOY X7 Loja" className="fixed inset-0 h-full w-full border-0" />;
}
