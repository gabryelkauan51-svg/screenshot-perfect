// O preço vale AQUI no servidor, nunca o que vem do navegador.
// Mantenha os preços da página (public/loja.html, CONFIG) iguais a estes.
export const PRODUTOS: Record<string, { nome: string; preco: number; entrega: string }> = {
  cpa: { nome: "Mentoria CPA", preco: 99.99, entrega: "https://t.me/SEU_CANAL" },
  sites: { nome: "Curso de Dinheiro com Sites", preco: 19.99, entrega: "https://t.me/SEU_CANAL" },
  vip: { nome: "Grupo VIP de Métodos", preco: 49.99, entrega: "https://t.me/SEU_CANAL" },
  ia: { nome: "Curso de Vídeos Virais com IA", preco: 15.99, entrega: "https://t.me/SEU_CANAL" },
};
export const igual = (a: unknown, b: unknown) => Math.abs(Number(a) - Number(b)) < 0.005;
