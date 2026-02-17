import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/config';
import { Transaction, TransactionType } from '../types/Transaction';

export class DatabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.key);
  }

  /**
   * Adiciona uma nova transação
   */
  async addTransaction(transaction: Transaction): Promise<{ success: boolean; error?: string }> {
    try {
      const insertData = {
        tipo: transaction.tipo,
        forma_pagamento: transaction.formaPagamento || null,
        categoria: transaction.categoria,
        valor: transaction.valor,
        parcelas: transaction.parcelas,
        parcela_atual: transaction.parcelaAtual,
        descricao: transaction.descricao,
        usuario: transaction.usuario,
        data: transaction.data.toISOString(),
        mes_referencia: transaction.mesReferencia
      };

      const { error } = await this.supabase
        .from('transactions')
        .insert([insertData]);

      if (error) {
        console.error('❌ Erro ao adicionar transação:', error);
        return { success: false, error: error.message };
      }

      const formaText = transaction.formaPagamento ? ` (${transaction.formaPagamento})` : '';
      console.log(`✅ Transação adicionada: ${transaction.tipo}${formaText} - ${transaction.categoria} - R$ ${transaction.valor.toFixed(2)}`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtém o saldo do mês atual
   */
  async getMonthlyBalance(mesReferencia: string): Promise<{
    totalEntradas: number;
    totalGastos: number;
    saldo: number;
    countEntradas: number;
    countGastos: number;
  }> {
    try {
      // Busca todas as transações do mês
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('mes_referencia', mesReferencia);

      if (error) {
        console.error('❌ Erro ao buscar saldo:', error);
        return { totalEntradas: 0, totalGastos: 0, saldo: 0, countEntradas: 0, countGastos: 0 };
      }

      const transactions = data || [];

      // Calcula totais - garante que sempre retorna número válido
      const totalEntradas = transactions
        .filter((t: any) => t.tipo === TransactionType.ENTRADA)
        .reduce((sum: number, t: any) => {
          const valor = parseFloat(t.valor);
          return sum + (isNaN(valor) ? 0 : valor);
        }, 0) || 0;

      const totalGastos = transactions
        .filter((t: any) => t.tipo === TransactionType.GASTO)
        .reduce((sum: number, t: any) => {
          const valor = parseFloat(t.valor);
          return sum + (isNaN(valor) ? 0 : valor);
        }, 0) || 0;

      const countEntradas = transactions.filter((t: any) => t.tipo === TransactionType.ENTRADA).length || 0;
      const countGastos = transactions.filter((t: any) => t.tipo === TransactionType.GASTO).length || 0;

      return {
        totalEntradas: totalEntradas || 0,
        totalGastos: totalGastos || 0,
        saldo: (totalEntradas || 0) - (totalGastos || 0),
        countEntradas: countEntradas || 0,
        countGastos: countGastos || 0
      };
    } catch (error) {
      console.error('❌ Erro ao calcular saldo:', error);
      return { totalEntradas: 0, totalGastos: 0, saldo: 0, countEntradas: 0, countGastos: 0 };
    }
  }

  /**
   * Obtém todas as transações do mês
   */
  async getMonthlyTransactions(mesReferencia: string): Promise<Transaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('mes_referencia', mesReferencia)
        .order('data', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar transações:', error);
        return [];
      }

      return (data || []).map((t: any) => ({
        id: t.id,
        tipo: t.tipo as TransactionType,
        categoria: t.categoria,
        valor: parseFloat(t.valor),
        parcelas: t.parcelas,
        parcelaAtual: t.parcela_atual,
        descricao: t.descricao,
        usuario: t.usuario,
        data: new Date(t.data),
        mesReferencia: t.mes_referencia
      }));
    } catch (error) {
      console.error('❌ Erro ao buscar transações:', error);
      return [];
    }
  }

  /**
   * Testa a conexão com o banco
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('transactions')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Erro ao testar conexão:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao testar conexão:', error);
      return false;
    }
  }
}

