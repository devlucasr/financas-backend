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

    // Limpa sessões inativas a cada 5 minutos
    setInterval(() => {
      const now = Date.now();
      this.sessions.forEach((session, key) => {
        const sessionTime = session.lastActivity || session.data.data?.getTime?.() || now;
        if (now - sessionTime > 1000 * 60 * 30) {
          this.sessions.delete(key);
        }
      });
    }, 1000 * 60 * 5);
  }

  // ---------------------------
  // Helper para enviar mensagens
  // ---------------------------
  private async reply(message: Message, content: string): Promise<void> {
    try {
      await message.reply(content);
    } catch (error) {
      try {
        const chat = await message.getChat();
        await chat.sendMessage(content);
      } catch (err) {
        console.error('❌ Erro ao enviar mensagem via fallback:', err);
      }
    }
  }

  // ---------------------------
  // Formata número de WhatsApp
  // ---------------------------
  private formatPhoneNumber(rawId: string): string {
    const cleaned = rawId.split('@')[0].split(':')[0];
    if (!/^\d+$/.test(cleaned)) return 'Usuário';
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
      const ddd = cleaned.substring(2, 4);
      const numero = cleaned.substring(4);
      const parte1 = numero.substring(0, numero.length - 4);
      const parte2 = numero.substring(numero.length - 4);
      return `(${ddd}) ${parte1}-${parte2}`;
    }
    return `Usuário *${cleaned.slice(-4)}`;
  }

  // ---------------------------
  // Processa mensagens
  // ---------------------------
  async handleCommand(message: Message): Promise<void> {
    const messageBody = message.body.trim();
    const command = messageBody.toLowerCase();
    const userId = message.author || message.from;
    
    if (!userId) return;

    // --- NOVO FILTRO MAIS ABRANGENTE ---
    // Lista de emojis/termos que indicam que a mensagem veio do bot
    const botIdentifiers = [
      "💰 *NOVO LANCHAMENTO*",
      "💵 *",          // Bloqueia o resumo da categoria selecionada
      "🏷️ *O QUE",      // Bloqueia o menu de categorias
      "📊 *SALDO",      // Bloqueia o saldo
      "🤖 *BOT",        // Bloqueia a ajuda
      "❌ Valor inválido", // Bloqueia o próprio erro para não entrar em loop
      "❌ Opção inválida"
    ];

    if (botIdentifiers.some(id => message.body.includes(id))) {
      return; 
    }
    // ------------------------------------

    let userName = 'Usuário';
    try {
      const contact = await message.getContact();
      userName = contact.pushname || contact.name || contact.number || 'Usuário';
    } catch {
      userName = this.formatPhoneNumber(userId);
    }

    if (command === '!cancelar') {
      if (this.sessions.has(userId)) {
        this.sessions.delete(userId);
        await this.reply(message, '❌ Lançamento cancelado com sucesso!');
      } else {
        await this.reply(message, 'ℹ️ Nenhum lançamento em andamento.');
      }
      return;
    }

    if (this.sessions.has(userId)) {
      // Se a mensagem for muito longa, provavelmente é o menu de categorias (que tem 63 itens)
      // Um valor ou comando raramente terá mais de 50 caracteres.
      if (messageBody.length > 50) {
        return; 
      }
      
      await this.handleSessionResponse(message, userId, userName);
      return;
    }

    if (!command.startsWith('!')) return;

    switch (command) {
      case '!lancar':
        await this.startTransaction(message, userId, userName);
        break;
      case '!saldo':
        await this.showBalance(message);
        break;
      case '!ajuda':
      case '!help':
        await this.showHelp(message);
        break;
      default:
        await this.reply(message, '❌ Comando não reconhecido.');
    }
  }

  // ---------------------------
  // Inicia lançamento
  // ---------------------------
  private async startTransaction(message: Message, userId: string, userName: string): Promise<void> {
    this.sessions.set(userId, {
      userId,
      step: 'awaiting_type',
      lastActivity: Date.now(),
      data: {
        usuario: userName,
        data: new Date(),
        mesReferencia: format(new Date(), 'yyyy-MM')
      }
    });

    const text =
      "💰 *NOVO LANÇAMENTO*\n\n" +
      "Escolha o tipo de transação:\n\n" +
      "1️⃣ GASTO\n" +
      "2️⃣ ENTRADA\n\n" +
      "✏️ Digite 1 ou 2\n" +
      "⚠️ Para cancelar, digite: !cancelar";

    await this.reply(message, text);
  }

  // ---------------------------
  // Processa respostas de sessão
  // ---------------------------
  private async handleSessionResponse(message: Message, userId: string, userName: string): Promise<void> {
    const session = this.sessions.get(userId)!;
    const response = message.body.trim();
    session.lastActivity = Date.now();

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
      default:
        await this.reply(message, '❌ Erro interno: etapa desconhecida. Use !cancelar e tente novamente.');
        this.sessions.delete(userId);
    }
  }

  // ---------------------------
  // Etapas do fluxo
  // ---------------------------
  private async handleTypeSelection(message: Message, session: UserSession, response: string): Promise<void> {
    if (response === '1') {
      session.data.tipo = TransactionType.GASTO;
      session.step = 'awaiting_forma_pagamento';

      const formas = config.formasPagamento.map((f, i) => `${i + 1}️⃣ ${f}`).join('\n');
      await this.reply(message,
        `📤 *GASTO SELECIONADO*\n\n` +
        `Como você pagou?\n\n` +
        `${formas}\n\n` +
        `✏️ Digite o número da forma de pagamento\n` +
        `⚠️ Para cancelar, digite: !cancelar`
      );

    } else if (response === '2') {
      session.data.tipo = TransactionType.ENTRADA;
      session.step = 'awaiting_categoria';

      const origens = config.categoriasEntrada.map((o, i) => `${i + 1}️⃣ ${o}`).join('\n');
      await this.reply(message,
        `📥 *ENTRADA SELECIONADA*\n\n` +
        `Escolha a origem:\n\n` +
        `${origens}\n\n` +
        `✏️ Digite o número da origem\n` +
        `⚠️ Para cancelar, digite: !cancelar`
      );

    } else {
      await this.reply(message, '❌ Opção inválida! Digite 1 para GASTO ou 2 para ENTRADA');
    }
  }

  private async handleFormaPagamentoSelection(message: Message, session: UserSession, response: string): Promise<void> {
    const idx = parseInt(response) - 1;
    if (isNaN(idx) || idx < 0 || idx >= config.formasPagamento.length) {
      await this.reply(message, '❌ Opção inválida! Digite um número válido da lista.');
      return;
    }

    session.data.formaPagamento = config.formasPagamento[idx];

    if (session.data.formaPagamento.toLowerCase().includes('parcelado')) {
      session.step = 'awaiting_parcelas';
      await this.reply(message,
        `💳 *PARCELADO SELECIONADO*\n\n` +
        `Em quantas vezes será parcelado?\n\n` +
        `✏️ Digite o número de parcelas (ex: 12)\n` +
        `⚠️ Para cancelar, digite: !cancelar`
      );
    } else {
      session.step = 'awaiting_categoria';
      await this.showCategoryMenu(message, session);
    }
  }

  private async handleParcelasSelection(message: Message, session: UserSession, response: string): Promise<void> {
    const parcelas = parseInt(response);
    if (isNaN(parcelas) || parcelas < 1 || parcelas > 99) {
      await this.reply(message, '❌ Número inválido! Digite um número entre 1 e 99.');
      return;
    }

    session.data.parcelas = parcelas;
    session.step = 'awaiting_categoria';
    await this.showCategoryMenu(message, session);
  }

  private async showCategoryMenu(message: Message, session: UserSession): Promise<void> {
    const categories = session.data.tipo === TransactionType.GASTO ? config.categoriasGasto : config.categoriasEntrada;
    if (!categories || categories.length === 0) {
      await this.reply(message, '❌ Nenhuma categoria configurada! Verifique o arquivo config.');
      this.sessions.delete(session.userId);
      return;
    }

    const catList = categories.map((c, i) => `${i + 1}️⃣ ${c}`).join('\n');
    const formaText = session.data.formaPagamento
      ? `\n💳 Forma: ${session.data.formaPagamento}${session.data.parcelas ? ` (${session.data.parcelas}x)` : ''}`
      : '';

    await this.reply(message,
      `🏷️ *O QUE VOCÊ COMPROU?*${formaText}\n\n` +
      `Escolha a categoria:\n\n` +
      `${catList}\n\n` +
      `✏️ Digite o número da categoria\n` +
      `⚠️ Para cancelar, digite: !cancelar`
    );
  }

  private async handleCategorySelection(message: Message, session: UserSession, response: string): Promise<void> {
    // Garantir que estamos no passo correto
    if (session.step !== 'awaiting_categoria') {
      console.warn(`Usuário ${session.userId} enviou resposta fora do passo. Step atual: ${session.step}`);
      await this.reply(message, '❌ Resposta recebida fora do passo esperado. Digite novamente o número da categoria ou !cancelar.');
      return;
    }
  
    // Pega categorias corretas
    const categories = session.data.tipo === TransactionType.GASTO ? config.categoriasGasto : config.categoriasEntrada;
  
    // Transforma resposta em índice
    const idx = parseInt(response.trim()) - 1;
  
    // Valida índice
    if (isNaN(idx) || idx < 0 || idx >= categories.length) {
      await this.reply(message, '❌ Opção inválida! Digite um número válido da lista.');
      return;
    }
  
    // Atualiza categoria e passo
    session.data.categoria = categories[idx];
    session.step = 'awaiting_value';
  
    // Monta resumo do gasto
    const resumo = session.data.tipo === TransactionType.GASTO
      ? `\n💳 ${session.data.formaPagamento || 'N/A'}${session.data.parcelas ? ` (${session.data.parcelas}x)` : ''}`
      : '';
  
    // Envia mensagem de valor
    await this.reply(message,
      `💵 *${session.data.categoria.toUpperCase()}*${resumo}\n\n` +
      `✏️ Digite o valor (ex: 100 ou 150.50)\n` +
      `⚠️ Para cancelar, digite: !cancelar`
    );
  }
  

  private async handleValueInput(message: Message, session: UserSession, response: string): Promise<void> {
    let cleanValue = response.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const valor = parseFloat(cleanValue);

    if (isNaN(valor) || valor <= 0) {
      await this.reply(message, '❌ Valor inválido! Digite um número válido.');
      return;
    }

    session.data.valor = valor;

    if (session.data.parcelas && session.data.parcelas > 1) {
      await this.createParceledTransaction(message, session);
    } else {
      await this.createSingleTransaction(message, session);
    }

    this.sessions.delete(session.userId);
  }

  // ---------------------------
  // Cria lançamento único
  // ---------------------------
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

    try {
      const result = await this.db.addTransaction(transaction);
      if (result.success) {
        const emoji = transaction.tipo === TransactionType.ENTRADA ? '📥' : '📤';
        const tipoText = transaction.tipo === TransactionType.ENTRADA ? 'ENTRADA' : 'GASTO';
        await this.reply(message,
          `${emoji} *${tipoText} REGISTRADO!*\n\n` +
          `💵 Valor: R$ ${transaction.valor.toFixed(2)}\n` +
          `🏷️ Categoria: ${transaction.categoria}\n` +
          `👤 Usuário: ${transaction.usuario}\n\n` +
          `✅ Lançamento salvo com sucesso!`
        );
      } else {
        await this.reply(message, `❌ Erro ao salvar: ${result.error || 'desconhecido'}`);
      }
    } catch (error) {
      await this.reply(message, `❌ Erro ao salvar: ${error}`);
    }
  }

  // ---------------------------
  // Cria lançamento parcelado
  // ---------------------------
  private async createParceledTransaction(message: Message, session: UserSession): Promise<void> {
    const parcelas = session.data.parcelas!;
    const valorTotal = session.data.valor!;
    const valorParcela = parseFloat((valorTotal / parcelas).toFixed(2));

    let somaParcelas = 0;
    let successCount = 0;

    for (let i = 1; i <= parcelas; i++) {
      const parcelaDate = new Date(session.data.data!);
      parcelaDate.setMonth(parcelaDate.getMonth() + (i - 1));

      const valorFinal = (i === parcelas) ? parseFloat((valorTotal - somaParcelas).toFixed(2)) : valorParcela;
      somaParcelas += valorFinal;

      const transaction: Transaction = {
        tipo: TransactionType.GASTO,
        formaPagamento: session.data.formaPagamento,
        categoria: session.data.categoria!,
        valor: valorFinal,
        parcelas,
        parcelaAtual: i,
        descricao: `Parcela ${i}/${parcelas}`,
        usuario: session.data.usuario!,
        data: parcelaDate,
        mesReferencia: format(parcelaDate, 'yyyy-MM')
      };

      try {
        const result = await this.db.addTransaction(transaction);
        if (result.success) successCount++;
      } catch {}
    }

    await this.reply(message,
      `💳 *PARCELAMENTO REGISTRADO!*\n\n` +
      `💵 Valor Total: R$ ${valorTotal.toFixed(2)}\n` +
      `💳 Parcelas: ${parcelas}x de aproximadamente R$ ${valorParcela.toFixed(2)}\n` +
      `🏷️ Categoria: ${session.data.categoria}\n` +
      `👤 Usuário: ${session.data.usuario}\n\n` +
      `✅ ${successCount}/${parcelas} parcelas salvas!\n` +
      `⚠️ Cada parcela foi lançada em um mês diferente`
    );
  }

  // ---------------------------
  // Mostra saldo do mês
  // ---------------------------
  private async showBalance(message: Message): Promise<void> {
    try {
      const mesAtual = format(new Date(), 'yyyy-MM');
      const balance = await this.db.getMonthlyBalance(mesAtual);

      const totalEntradas = balance.totalEntradas || 0;
      const totalGastos = balance.totalGastos || 0;
      const saldo = balance.saldo || 0;
      const countEntradas = balance.countEntradas || 0;
      const countGastos = balance.countGastos || 0;

      const saldoEmoji = saldo >= 0 ? '✅' : '⚠️';
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const data = new Date();
      const mesFormatado = `${meses[data.getMonth()]}/${data.getFullYear()}`;

      const mensagemAdicional = countEntradas === 0 && countGastos === 0
        ? '\n💡 Ainda não há lançamentos este mês. Use !lancar para começar.'
        : saldo < 0 
          ? '\n⚠️ Atenção: Você está gastando mais do que ganha!'
          : '';

      await this.reply(message,
        `📊 *SALDO DO MÊS*\n` +
        `📅 ${mesFormatado}\n\n` +
        `📥 Entradas: R$ ${totalEntradas.toFixed(2)}\n` +
        `📤 Gastos: R$ ${totalGastos.toFixed(2)}\n\n` +
        `${saldoEmoji} *Saldo: R$ ${saldo.toFixed(2)}*${mensagemAdicional}`
      );
    } catch (error) {
      console.error('❌ Erro ao mostrar saldo:', error);
      await this.reply(message, '❌ Erro ao buscar saldo. Tente novamente em instantes.');
    }
  }

  // ---------------------------
  // Mostra ajuda
  // ---------------------------
  private async showHelp(message: Message): Promise<void> {
    await this.reply(message,
      `🤖 *BOT FINANCEIRO - COMANDOS*\n\n` +
      `*!lancar* - Registrar novo gasto ou entrada\n` +
      `*!saldo* - Ver saldo do mês atual\n` +
      `*!ajuda* - Mostrar esta mensagem\n` +
      `*!cancelar* - Cancelar lançamento em andamento\n\n` +
      `📝 *Como usar:*\n` +
      `1️⃣ Digite !lancar\n` +
      `2️⃣ Escolha tipo (Gasto/Entrada)\n` +
      `3️⃣ Escolha categoria\n` +
      `4️⃣ Digite o valor\n` +
      `5️⃣ Pronto!\n\n` +
      `💡 *Dica:* Para gastos parcelados, escolha a forma de pagamento "Parcelado" e informe a quantidade de vezes.`
    );
  }
}
