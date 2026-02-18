export enum TransactionType {
  GASTO = "GASTO",
  ENTRADA = "ENTRADA",
}

export interface Transaction {
  id?: string;
  tipo: TransactionType;
  formaPagamento?: string; // Como pagou: Cartão, PIX, Dinheiro, Parcelado
  categoria: string; // O que foi: Mercado, Combustível, etc
  valor: number;
  parcelas?: number;
  parcelaAtual?: number;
  descricao?: string;
  usuario: string;
  data: Date;
  mesReferencia: string;
}

export interface MonthlyBalance {
  mes: string;
  totalEntradas: number;
  totalGastos: number;
  saldo: number;
  transacoes: Transaction[];
}

export interface UserSession {
  userId: string;
  lastActivity?: number;
  step:
    | "awaiting_type"
    | "awaiting_forma_pagamento"
    | "awaiting_categoria"
    | "awaiting_parcelas"
    | "awaiting_value"
    | "complete";
  data: Partial<Transaction>;
}
