import { Message } from 'whatsapp-web.js';
import { DatabaseService } from '../database/supabase';
import { UserSession, Transaction, TransactionType } from '../types/Transaction';
import { config } from '../config/config';
import { format } from 'date-fns';

export class CommandHandler {
  private db: DatabaseService;
  private sessions: Map<string, UserSession> = new Map();

  constructor() {
    this.db = new DatabaseService();
  }

  /**
   * Responde uma mensagem sem tentar marcar como lida (evita bug do sendSeen)
   */
  private async reply(message: Message, content: string): Promise<void> {
    try {
      await message.reply(content, undefined, { sendSeen: false });
    } catch (error) {
      console.error('❌ Erro ao responder mensagem:', error);
    }
  }

  /**
   * Extrai número de telefone limpo de IDs do WhatsApp
   * Exemplo: "5511999999999@c.us" → "11 99999-9999"
   */
  private formatPhoneNumber(rawId: string): string {
    // Remove sufixos do WhatsApp (@c.us, @g.us, @lid, etc)
    const cleaned = rawId.split('@')[0].split(':')[0];
    
    // Se não é um número, retorna "Usuário"
    if (!/^\d+$/.test(cleaned)) {
      return 'Usuário';
    }
    
    // Se tem código do país (55 do Brasil)
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      const ddd = cleaned.substring(2, 4);
      const numero = cleaned.substring(4);
      const parte1 = numero.substring(0, numero.length - 4);
      const parte2 = numero.substring(numero.length - 4);
      return `(${ddd}) ${parte1}-${parte2}`;
    }
    
    // Outros formatos: só retorna os últimos 4 dígitos
    return `Usuário *${cleaned.slice(-4)}`;
  }

  /**
   * Processa comandos e respostas do bot
   */
  async handleCommand(message: Message): Promise<void> {
    const messageBody = message.body.trim();
    const command = messageBody.toLowerCase();
    
    // Usa message.from como ID (mais confiável em grupos)
    const userId = message.from;
    
    // Tenta pegar o nome do contato (com fallback seguro)
    let userName = 'Usuário';
    try {
      const contact = await message.getContact();
      userName = contact.pushname || contact.name || contact.number || 'Usuário';
    } catch (error) {
      // Se falhar ao pegar contato, formata o número do remetente
      const rawId = message.author || message.from || '';
      userName = this.formatPhoneNumber(rawId);
    }

    // IMPORTANTE: Verifica !cancelar PRIMEIRO, antes de processar sessão
    // Isso permite cancelar em QUALQUER momento do lançamento
    if (command === '!cancelar') {
      if (this.sessions.has(userId)) {
        this.sessions.delete(userId);
        await this.reply(message, '❌ Lançamento cancelado com sucesso!');
      } else {
        await this.reply(message, 'ℹ️ Nenhum lançamento em andamento.');
      }
      return;
    }

    // Se o usuário tem uma sessão ativa, QUALQUER mensagem é processada como resposta
    if (this.sessions.has(userId)) {
      await this.handleSessionResponse(message, userId, userName);
      return;
    }

    // Se não tem sessão, só processa comandos (começam com !)
    if (!command.startsWith('!')) {
      return; // Ignora mensagens normais sem sessão
    }

    // Comando !lancar
    if (command === '!lancar') {
      await this.startTransaction(message, userId, userName);
      return;
    }

    // Comando !saldo
    if (command === '!saldo') {
      await this.showBalance(message);
      return;
    }

    // Comando !ajuda
    if (command === '!ajuda' || command === '!help') {
      await this.showHelp(message);
      return;
    }
  }

  /**
   * Inicia um novo lançamento
   */
  private async startTransaction(message: Message, userId: string, userName: string): Promise<void> {
    // Cria uma nova sessão
    this.sessions.set(userId, {
      userId,
      step: 'awaiting_type',
      data: {
        usuario: userName,
        data: new Date(),
        mesReferencia: format(new Date(), 'yyyy-MM')
      }
    });

    const chat = await message.getChat();
    
    // Por enquanto, usa texto normal (botões ainda não são bem suportados)
    await this.reply(message, `
💰 *NOVO LANÇAMENTO*

Escolha o tipo de transação:

1️⃣ GASTO
2️⃣ ENTRADA

_Digite 1 ou 2_
_(!cancelar para cancelar)_
    `.trim());
  }

  /**
   * Processa respostas do usuário durante o fluxo
   */
  private async handleSessionResponse(message: Message, userId: string, userName: string): Promise<void> {
    const session = this.sessions.get(userId)!;
    const response = message.body.trim();

    switch (session.step) {
      case 'awaiting_type':
        await this.handleTypeSelection(message, session, response);
        break;

      case 'awaiting_forma_pagamento':
        await this.handleFormaPagamentoSelection(message, session, response);
        break;

      case 'awaiting_categoria':
        await this.handleCategorySelection(message, session, response);
        break;

      case 'awaiting_parcelas':
        await this.handleParcelasSelection(message, session, response);
        break;

      case 'awaiting_value':
        await this.handleValueInput(message, session, response);
        break;
    }
  }

  /**
   * Processa seleção de tipo (Gasto/Entrada)
   */
  private async handleTypeSelection(message: Message, session: UserSession, response: string): Promise<void> {
    if (response === '1') {
      // GASTO: Pergunta forma de pagamento primeiro
      session.data.tipo = TransactionType.GASTO;
      session.step = 'awaiting_forma_pagamento';

      const formas = config.formasPagamento.map((forma, idx) => `${idx + 1}️⃣ ${forma}`).join('\n');
      await this.reply(message, `
📤 *GASTO SELECIONADO*

Como você pagou?

${formas}

_Digite o número da forma de pagamento_
_(!cancelar para cancelar)_
      `.trim());
    } else if (response === '2') {
      // ENTRADA: Pergunta origem direto (sem forma de pagamento)
      session.data.tipo = TransactionType.ENTRADA;
      session.step = 'awaiting_categoria';

      const origens = config.categoriasEntrada.map((origem, idx) => `${idx + 1}️⃣ ${origem}`).join('\n');
      await this.reply(message, `
📥 *ENTRADA SELECIONADA*

Escolha a origem:

${origens}

_Digite o número da origem_
_(!cancelar para cancelar)_
      `.trim());
    } else {
      await this.reply(message, '❌ Opção inválida! Digite 1 para GASTO ou 2 para ENTRADA');
    }
  }

  /**
   * Processa seleção de forma de pagamento (só para GASTOS)
   */
  private async handleFormaPagamentoSelection(message: Message, session: UserSession, response: string): Promise<void> {
    const formaIndex = parseInt(response) - 1;

    if (isNaN(formaIndex) || formaIndex < 0 || formaIndex >= config.formasPagamento.length) {
      await this.reply(message, '❌ Opção inválida! Digite um número válido da lista.');
      return;
    }

    session.data.formaPagamento = config.formasPagamento[formaIndex];

    if (!session.data.formaPagamento) {
      await this.reply(message, '❌ Erro ao selecionar forma de pagamento. Tente novamente com !lancar');
      this.sessions.delete(session.userId);
      return;
    }

    // Se o nome contém "Parcelado" (case insensitive), pergunta quantidade de parcelas
    if (session.data.formaPagamento.toLowerCase().includes('parcelado')) {
      session.step = 'awaiting_parcelas';
      await this.reply(message, `
💳 *PARCELADO SELECIONADO*

Em quantas vezes será parcelado?

_Digite o número de parcelas (ex: 12)_
_(!cancelar para cancelar)_
      `.trim());
    } else {
      // Senão, vai direto para escolher a categoria
      session.step = 'awaiting_categoria';
      this.showCategoryMenu(message, session);
    }
  }

  /**
   * Mostra menu de categorias de gastos
   */
  private async showCategoryMenu(message: Message, session: UserSession): Promise<void> {
    if (!config.categoriasGasto || config.categoriasGasto.length === 0) {
      await this.reply(message, '❌ Erro: Nenhuma categoria de gasto configurada! Verifique o arquivo .env');
      this.sessions.delete(session.userId);
      return;
    }

    const categories = config.categoriasGasto.map((cat, idx) => `${idx + 1}️⃣ ${cat}`).join('\n');
    
    const formaPagText = session.data.formaPagamento 
      ? `\n💳 Forma: ${session.data.formaPagamento}${session.data.parcelas ? ` (${session.data.parcelas}x)` : ''}`
      : '';

    await this.reply(message, `
🏷️ *O QUE VOCÊ COMPROU?*${formaPagText}

Escolha a categoria:

${categories}

_Digite o número da categoria_
_(!cancelar para cancelar)_
    `.trim());
  }

  /**
   * Processa seleção de categoria
   */
  private async handleCategorySelection(message: Message, session: UserSession, response: string): Promise<void> {
    const categoryIndex = parseInt(response) - 1;
    const categories = session.data.tipo === TransactionType.GASTO 
      ? config.categoriasGasto 
      : config.categoriasEntrada;

    if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= categories.length) {
      await this.reply(message, '❌ Opção inválida! Digite um número válido da lista.');
      return;
    }

    session.data.categoria = categories[categoryIndex];

    // Verificação de segurança
    if (!session.data.categoria) {
      await this.reply(message, '❌ Erro ao selecionar categoria. Tente novamente com !lancar');
      this.sessions.delete(session.userId);
      return;
    }

    // Agora sempre vai para digitar o valor (parcelas já foi tratado antes)
    session.step = 'awaiting_value';
    
    const resumo = session.data.tipo === TransactionType.GASTO
      ? `\n💳 ${session.data.formaPagamento || 'N/A'}${session.data.parcelas ? ` (${session.data.parcelas}x)` : ''}`
      : '';

    await this.reply(message, `
💵 *${session.data.categoria.toUpperCase()}*${resumo}

Digite o valor:

_Exemplos: 100 ou 150.50 ou 1500_
_(!cancelar para cancelar)_
    `.trim());
  }

  /**
   * Processa número de parcelas
   */
  private async handleParcelasSelection(message: Message, session: UserSession, response: string): Promise<void> {
    const parcelas = parseInt(response);

    if (isNaN(parcelas) || parcelas < 1 || parcelas > 99) {
      await this.reply(message, '❌ Número inválido! Digite um número entre 1 e 99.');
      return;
    }

    session.data.parcelas = parcelas;
    
    // Agora vai para escolher a categoria
    session.step = 'awaiting_categoria';
    await this.showCategoryMenu(message, session);
  }

  /**
   * Processa valor e finaliza o lançamento
   */
  private async handleValueInput(message: Message, session: UserSession, response: string): Promise<void> {
    // Remove R$ e espaços
    let cleanValue = response.replace(/[R$\s]/g, '');
    
    // Detecta o formato e normaliza para formato EN (ponto como decimal)
    const hasComma = cleanValue.includes(',');
    const hasDot = cleanValue.includes('.');
    
    if (hasComma && hasDot) {
      // Formato BR: 3.728,66 ou 1.234.567,89
      // Remove pontos (milhares) e troca vírgula por ponto (decimal)
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (hasComma) {
      // Só vírgula: 150,50 (formato BR)
      // Troca vírgula por ponto
      cleanValue = cleanValue.replace(',', '.');
    } else if (hasDot) {
      // Só ponto: pode ser 6.50 (formato EN) ou 1.500 (mil e quinhentos BR)
      // Se tem 3 dígitos após o ponto, é milhares (1.500)
      // Se tem 1 ou 2 dígitos, é decimal (6.5 ou 6.50)
      const parts = cleanValue.split('.');
      if (parts.length === 2 && parts[1].length === 3) {
        // É milhares: 1.500 → 1500
        cleanValue = cleanValue.replace(/\./g, '');
      }
      // Senão, mantém o ponto como decimal: 6.50
    }
    // Se não tem nada, é inteiro: 100
    
    const valor = parseFloat(cleanValue);

    if (isNaN(valor) || valor <= 0) {
      await this.reply(message, '❌ Valor inválido! Digite um número válido (ex: 100, 150,50 ou 6.50)');
      return;
    }

    session.data.valor = valor;

    // Se for parcelado, cria múltiplas transações (uma para cada parcela)
    if (session.data.parcelas && session.data.parcelas > 1) {
      await this.createParceledTransaction(message, session);
    } else {
      await this.createSingleTransaction(message, session);
    }

    // Limpa a sessão
    this.sessions.delete(session.userId);
  }

  /**
   * Cria uma transação única
   */
  private async createSingleTransaction(message: Message, session: UserSession): Promise<void> {
    const transaction: Transaction = {
      tipo: session.data.tipo!,
      formaPagamento: session.data.formaPagamento,
      categoria: session.data.categoria!,
      valor: session.data.valor!,
      usuario: session.data.usuario!,
      data: session.data.data!,
      mesReferencia: session.data.mesReferencia!
    };

    const result = await this.db.addTransaction(transaction);

    if (result.success) {
      const emoji = transaction.tipo === TransactionType.ENTRADA ? '📥' : '📤';
      const tipoText = transaction.tipo === TransactionType.ENTRADA ? 'ENTRADA' : 'GASTO';
      
      await this.reply(message, `
${emoji} *${tipoText} REGISTRADO!*

💵 Valor: R$ ${transaction.valor.toFixed(2)}
🏷️ Categoria: ${transaction.categoria}
👤 Usuário: ${transaction.usuario}

✅ Lançamento salvo com sucesso!
      `.trim());
    } else {
      await this.reply(message, `❌ Erro ao salvar: ${result.error}`);
    }
  }

  /**
   * Cria transações parceladas
   */
  private async createParceledTransaction(message: Message, session: UserSession): Promise<void> {
    const valorParcela = session.data.valor! / session.data.parcelas!;
    let successCount = 0;

    // Cria uma transação para cada parcela
    for (let i = 1; i <= session.data.parcelas!; i++) {
      const parcelaDate = new Date(session.data.data!);
      parcelaDate.setMonth(parcelaDate.getMonth() + (i - 1));

      const transaction: Transaction = {
        tipo: TransactionType.GASTO,
        formaPagamento: session.data.formaPagamento,
        categoria: session.data.categoria!,
        valor: valorParcela,
        parcelas: session.data.parcelas,
        parcelaAtual: i,
        descricao: `Parcela ${i}/${session.data.parcelas}`,
        usuario: session.data.usuario!,
        data: parcelaDate,
        mesReferencia: format(parcelaDate, 'yyyy-MM')
      };

      const result = await this.db.addTransaction(transaction);
      if (result.success) successCount++;
    }

    await this.reply(message, `
💳 *PARCELAMENTO REGISTRADO!*

💵 Valor Total: R$ ${session.data.valor!.toFixed(2)}
💳 Parcelas: ${session.data.parcelas}x de R$ ${valorParcela.toFixed(2)}
🏷️ Categoria: ${session.data.categoria}
👤 Usuário: ${session.data.usuario}

✅ ${successCount}/${session.data.parcelas} parcelas salvas!
_Cada parcela foi lançada em um mês diferente_
    `.trim());
  }

  /**
   * Mostra o saldo do mês
   */
  private async showBalance(message: Message): Promise<void> {
    try {
      const mesAtual = format(new Date(), 'yyyy-MM');
      const balance = await this.db.getMonthlyBalance(mesAtual);

      // Garante valores numéricos válidos (nunca NaN ou undefined)
      const totalEntradas = balance.totalEntradas || 0;
      const totalGastos = balance.totalGastos || 0;
      const saldo = balance.saldo || 0;
      const countEntradas = balance.countEntradas || 0;
      const countGastos = balance.countGastos || 0;

      const saldoEmoji = saldo >= 0 ? '✅' : '⚠️';
      
      // Formata mês em português manualmente
      const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                     'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const data = new Date();
      const mesFormatado = `${meses[data.getMonth()]}/${data.getFullYear()}`;

      // Mensagem customizada se não há lançamentos
      const mensagemAdicional = countEntradas === 0 && countGastos === 0
        ? '\n💡 _Ainda não há lançamentos este mês. Use !lancar para começar._'
        : saldo < 0 
        ? '\n⚠️ _Atenção: Você está gastando mais do que ganha!_'
        : '';

      await this.reply(message, `
📊 *SALDO DO MÊS*
📅 ${mesFormatado}

📥 Entradas: R$ ${totalEntradas.toFixed(2)}
📤 Gastos: R$ ${totalGastos.toFixed(2)}

${saldoEmoji} *Saldo: R$ ${saldo.toFixed(2)}*${mensagemAdicional}
      `.trim());
    } catch (error) {
      console.error('❌ Erro ao mostrar saldo:', error);
      await this.reply(message, '❌ Erro ao buscar saldo. Tente novamente em instantes.');
    }
  }

  /**
   * Mostra ajuda
   */
  private async showHelp(message: Message): Promise<void> {
    await this.reply(message, `
🤖 *BOT FINANCEIRO - COMANDOS*

*!lancar* - Registrar novo gasto ou entrada
*!saldo* - Ver saldo do mês atual
*!ajuda* - Mostrar esta mensagem
*!cancelar* - Cancelar lançamento em andamento

📝 *Como usar:*
1. Digite !lancar
2. Escolha tipo (Gasto/Entrada)
3. Escolha categoria
4. Digite o valor
5. Pronto!

💡 *Dica:* Para gastos parcelados, escolha a categoria "Parcelado" e informe a quantidade de vezes.
    `.trim());
  }

}

