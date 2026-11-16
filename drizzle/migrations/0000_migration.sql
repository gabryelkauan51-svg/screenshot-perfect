CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto text NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  whatsapp text NOT NULL,
  valor numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  txid text,
  pix text,
  expires_at timestamptz,
  ip text,
  ultima_consulta timestamptz,
  paid_at timestamptz,
  criado timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.pedidos TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE INDEX pedidos_ip_criado ON public.pedidos (ip, criado);