/**
 * Script para configurar o banco de dados no Supabase
 *
 * Execute este SQL no Supabase SQL Editor:
 * https://supabase.com/dashboard/project/SEU_PROJETO/editor
 */

export const setupSQL = `
-- Criação da tabela de transações
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('GASTO', 'ENTRADA')),
  forma_pagamento VARCHAR(50),
  categoria VARCHAR(100) NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  parcelas INTEGER,
  parcela_atual INTEGER,
  descricao TEXT,
  usuario VARCHAR(100) NOT NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL,
  mes_referencia VARCHAR(7) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_transactions_mes ON transactions(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_transactions_tipo ON transactions(tipo);
CREATE INDEX IF NOT EXISTS idx_transactions_data ON transactions(data DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_usuario ON transactions(usuario);

-- Comentários
COMMENT ON TABLE transactions IS 'Transações financeiras (gastos e entradas)';
COMMENT ON COLUMN transactions.tipo IS 'Tipo de transação: GASTO ou ENTRADA';
COMMENT ON COLUMN transactions.forma_pagamento IS 'Como foi pago (apenas gastos): Cartão, PIX, Dinheiro, Parcelado';
COMMENT ON COLUMN transactions.categoria IS 'O que foi comprado/origem: Mercado, Combustível, Salário Lucas, etc';
COMMENT ON COLUMN transactions.valor IS 'Valor da transação em reais';
COMMENT ON COLUMN transactions.parcelas IS 'Número de parcelas (apenas para gastos parcelados)';
COMMENT ON COLUMN transactions.parcela_atual IS 'Parcela atual (ex: 1 de 12)';
COMMENT ON COLUMN transactions.usuario IS 'Nome do usuário que criou a transação';
COMMENT ON COLUMN transactions.mes_referencia IS 'Mês de referência no formato YYYY-MM';

-- Habilitar RLS (Row Level Security) - opcional
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (para simplicidade)
-- CREATE POLICY "Permitir todas operações" ON transactions FOR ALL USING (true);

-- Visualização para relatórios mensais
CREATE OR REPLACE VIEW monthly_summary AS
SELECT 
  mes_referencia,
  tipo,
  COUNT(*) as total_transacoes,
  SUM(valor) as total_valor
FROM transactions
GROUP BY mes_referencia, tipo
ORDER BY mes_referencia DESC;

-- Função para obter saldo do mês
CREATE OR REPLACE FUNCTION get_monthly_balance(ref_month VARCHAR(7))
RETURNS TABLE (
  total_entradas DECIMAL,
  total_gastos DECIMAL,
  saldo DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE 0 END), 0) as total_entradas,
    COALESCE(SUM(CASE WHEN tipo = 'GASTO' THEN valor ELSE 0 END), 0) as total_gastos,
    COALESCE(SUM(CASE WHEN tipo = 'ENTRADA' THEN valor ELSE -valor END), 0) as saldo
  FROM transactions
  WHERE mes_referencia = ref_month;
END;
$$ LANGUAGE plpgsql;

-- Verificar se está tudo ok
SELECT 
  '✅ Banco de dados configurado com sucesso!' as status,
  COUNT(*) as total_transacoes 
FROM transactions;
`;

// Exibe o SQL para copiar
console.log("=".repeat(80));
console.log("📋 COPIE O SQL ABAIXO E EXECUTE NO SUPABASE SQL EDITOR:");
console.log("=".repeat(80));
console.log("\n" + setupSQL + "\n");
console.log("=".repeat(80));
console.log(
  "\n📍 Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/editor"
);
console.log('📝 Cole o SQL acima e clique em "Run"');
console.log("\n✅ Depois disso, seu banco estará pronto!\n");
