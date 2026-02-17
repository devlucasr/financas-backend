import dotenv from "dotenv";

dotenv.config();

export const config = {
  // WhatsApp
  groupName: process.env.GROUP_NAME || "Financas",

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || "",
    key: process.env.SUPABASE_KEY || "",
  },

  // Formas de pagamento (para gastos)
  formasPagamento: (
    process.env.FORMAS_PAGAMENTO || "Cartão de Crédito,PIX,Dinheiro,Parcelado"
  )
    .split(",")
    .map((c) => c.trim()),

  // Categorias de gastos detalhadas
  categoriasGasto: (
    process.env.CATEGORIAS_GASTO || "Mercado,Restaurante,Combustível,Outros"
  )
    .split(",")
    .map((c) => c.trim()),

  // Categorias de entradas
  categoriasEntrada: (
    process.env.CATEGORIAS_ENTRADA ||
    "Salário Lucas,Salário Júlia,Cartão Flash,Extra Lucas"
  )
    .split(",")
    .map((c) => c.trim()),

  // Timezone
  timezone: process.env.TZ || "America/Sao_Paulo",
};

// Validação
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (
    !config.supabase.url ||
    config.supabase.url === "https://seu-projeto.supabase.co"
  ) {
    errors.push("❌ SUPABASE_URL não configurada! Configure no arquivo .env");
  }

  if (!config.supabase.key || config.supabase.key === "sua-chave-anon-aqui") {
    errors.push("❌ SUPABASE_KEY não configurada! Configure no arquivo .env");
  }

  if (!config.groupName) {
    errors.push("❌ GROUP_NAME não configurado!");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
