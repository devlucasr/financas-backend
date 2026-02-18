import { Client, LocalAuth, Message } from "whatsapp-web.js";
import QRCode from "qrcode";
import { CommandHandler } from "./CommandHandler";
import { DatabaseService } from "../database/supabase";
import { config } from "../config/config";

export class WhatsAppBot {
  private client: Client;
  private commandHandler: CommandHandler;
  private db: DatabaseService;
  private groupId: string | null = null;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: "/app/.wwebjs_auth",
      }),
      puppeteer: {
        executablePath:
          process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
        ],        
      },
    });
    
    this.commandHandler = new CommandHandler();
    this.db = new DatabaseService();
    this.setupEventHandlers();
  }

  /**
   * Configura os event handlers
   */
  private setupEventHandlers(): void {
    // QR Code
    this.client.on("qr", async (qr) => {
      const url = await QRCode.toDataURL(qr);
    
      console.log("QR_CODE_URL:", url);
    });

    // Cliente pronto
    this.client.on("ready", async () => {
      console.log("✅ Bot conectado ao WhatsApp!\n");

      // Testa conexão com banco
      const dbConnected = await this.db.testConnection();
      if (dbConnected) {
        console.log("✅ Banco de dados conectado!\n");
      } else {
        console.log("⚠️  Erro ao conectar com banco de dados!");
        console.log("📝 Execute: npm run db:setup e siga as instruções\n");
      }

      await this.findTargetGroup();
      this.displayInfo();
    });

    // Autenticação
    this.client.on("authenticated", () => {
      console.log("✅ Autenticação realizada!");
    });

    // Falha na autenticação
    this.client.on("auth_failure", (msg) => {
      console.error("❌ Falha na autenticação:", msg);
    });

    // Desconectado
    this.client.on("disconnected", async (reason) => {
      console.log("⚠️ Cliente desconectado:", reason);
      console.log("🔄 Reiniciando em 5 segundos...");

      setTimeout(async () => {
        try {
          await this.client.initialize();
          console.log("✅ Bot reconectado!");
        } catch (error) {
          console.error("❌ Erro ao reiniciar:", error);
        }
      }, 5000);
    });

    // Nova mensagem (usa apenas um evento para evitar duplicação)
    this.client.on("message_create", async (message: Message) => {
      await this.handleMessage(message);
    });
  }

  /**
   * Encontra o grupo alvo
   */
  private async findTargetGroup(): Promise<void> {
    try {
      const chats = await this.client.getChats();
      const groups = chats.filter((chat) => chat.isGroup);

      // Loga grupos disponíveis para facilitar debug de nome
      if (groups.length > 0) {
        console.log("📋 Grupos encontrados:");
        groups.forEach((g) => console.log(` - ${g.name}`));
        console.log("");
      } else {
        console.warn("⚠️ Nenhum grupo encontrado na conta.");
      }

      // Busca o grupo configurado
      const targetGroup = groups.find(
        (chat) => chat.name === config.groupName
      );

      if (targetGroup) {
        this.groupId = targetGroup.id._serialized;
        console.log(`✅ Grupo alvo encontrado: "${config.groupName}"`);
        console.log(`📱 Bot operando no grupo correto!\n`);
      } else {
        console.warn(`⚠️  ATENÇÃO: Grupo "${config.groupName}" NÃO encontrado!\n`);
        console.log("💡 Copie o nome EXATO de um dos grupos acima e cole no .env:");
        console.log(`   GROUP_NAME=Nome Exato Do Grupo\n`);
        console.log("⚠️  O bot NÃO vai responder até você configurar o grupo correto!\n");
      }
    } catch (error) {
      console.warn("⚠️ Não foi possível listar os grupos (getChats falhou). Vou tentar identificar o grupo na primeira mensagem recebida.", error);
    }
  }

  /**
   * Processa mensagens
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();

      // Se ainda não temos groupId (falhou getChats), tenta identificar pelo nome do chat atual
      if (!this.groupId && chat.isGroup && chat.name === config.groupName) {
        this.groupId = chat.id._serialized;
        console.log(`✅ Grupo alvo identificado pelo chat: "${config.groupName}"`);
      }

      // Ignora mensagens fora do grupo alvo ANTES de fazer qualquer log
      if (!this.groupId || chat.id._serialized !== this.groupId) {
        return; // Silenciosamente ignora
      }

      const messageBody = message.body.trim();
      
      // IMPORTANTE: Ignora mensagens do bot (começam com emojis específicos)
      // Essa é a forma mais confiável de identificar mensagens do bot
      const botPrefixes = ['💰', '📤', '📥', '✅', '❌', '📊', '🤖', '💳', '💵', '⚠️', '🏷️', 'ℹ️'];
      if (botPrefixes.some(prefix => messageBody.startsWith(prefix))) {
        return; // Silenciosamente ignora mensagens do próprio bot
      }

      // Log para debug (apenas em desenvolvimento)
      console.log(`📨 Mensagem recebida: "${messageBody.substring(0, 50)}${messageBody.length > 50 ? '...' : ''}"`);

      // Processa a mensagem no CommandHandler
      await this.commandHandler.handleCommand(message);
      
    } catch (error) {
      console.error("❌ Erro ao processar mensagem:", error);
    }
  }

  /**
   * Exibe informações do bot
   */
  private displayInfo(): void {
    console.log("═".repeat(60));
    console.log("🤖 BOT FINANCEIRO ATIVO");
    console.log("═".repeat(60));
    console.log(`📱 Grupo: ${config.groupName}`);
    console.log(`\n🎯 Comandos disponíveis:`);
    console.log("   !lancar  - Registrar gasto ou entrada");
    console.log("   !saldo   - Ver saldo do mês");
    console.log("   !ajuda   - Mostrar ajuda");
    console.log("   !cancelar - Cancelar lançamento\n");
    console.log("═".repeat(60));
    console.log("✅ Aguardando comandos...\n");
  }

  /**
   * Inicia o bot
   */
  async start(): Promise<void> {
    console.log("🚀 Iniciando Bot Financeiro...\n");
    await this.client.initialize();
  }

  /**
   * Para o bot
   */
  async stop(): Promise<void> {
    console.log("\n⏹️  Encerrando bot...");
    await this.client.destroy();
  }
}
