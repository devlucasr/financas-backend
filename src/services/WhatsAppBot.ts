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
      authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-software-rasterizer",
        ],
      },
    });

    this.commandHandler = new CommandHandler();
    this.db = new DatabaseService();
    this.setupEvents();
  }

  private setupEvents() {
    // QR CODE
    this.client.on("qr", async (qr) => {
      const url = await QRCode.toDataURL(qr);
      console.log("\n🔐 ESCANEIE O QR CODE:");
      console.log(url, "\n");
    });

    // READY
    this.client.on("ready", async () => {
      console.log("✅ Bot conectado!");

      try {
        const chats = await this.client.getChats();
        const groups = chats.filter((c) => c.isGroup);
        if (groups.length > 0) {
          console.log("📋 Grupos encontrados:");
          groups.forEach((g) => console.log("-", g.name));
        }

        const targetGroup = groups.find((g) => g.name === config.groupName);
        if (targetGroup) {
          this.groupId = targetGroup.id._serialized;
          console.log(`✅ Grupo encontrado: ${targetGroup.name}`);
        } else {
          console.log(`⚠️ Grupo "${config.groupName}" não encontrado no momento.`);
          console.log("Será identificado automaticamente na primeira mensagem recebida.");
        }
      } catch (err: any) {
        console.log("⚠️ Não foi possível listar grupos via getChats(). Será identificado na primeira mensagem recebida.", err.message);
      }

      this.showInfo();
    });

    // AUTH
    this.client.once("authenticated", () => console.log("✅ Autenticação realizada!"));
    this.client.on("auth_failure", (msg) => console.log("❌ Falha auth:", msg));

    // DISCONNECT
    this.client.on("disconnected", async (reason) => {
      console.log("⚠️ Desconectado:", reason);
      await this.delay(5000);
      await this.client.initialize();
    });

    // MESSAGE
    this.client.on("message_create", async (message) => {
      await this.handleMessage(message);
    });
  }

  private async handleMessage(message: Message) {
    try {
      const chat = await message.getChat();
      const body = message.body.trim();
  
      // Identifica grupo na primeira mensagem
      if (!this.groupId && chat.isGroup && chat.name === config.groupName) {
        this.groupId = chat.id._serialized;
        console.log(`✅ Grupo identificado via primeira mensagem: "${config.groupName}"`);
      }
  
      // 1. Ignora mensagens fora do grupo alvo
      if (!this.groupId || chat.id._serialized !== this.groupId) return;
  
      // 2. FILTRO DE SEGURANÇA: Ignora se a mensagem contém os títulos dos menus
      // Isso é mais seguro que startsWith para evitar loops
      const botMenus = ["💰", "📊", "📤", "📥", "🤖", "✅", "❌", "💵", "🏷️"];
      if (botMenus.some((prefix) => body.includes(prefix))) return;

      // 3. Ignora mensagens vazias (como figurinhas ou mídias sem legenda)
      if (!body) return;
  
      const userName = (await message.getContact()).pushname || 'Usuário';
      console.log(`📨 Mensagem recebida: ${body} from: ${userName}`);
  
      // Passa para o handler
      await this.commandHandler.handleCommand(message);
  
    } catch (e) {
      console.log("❌ Erro ao processar mensagem:", e);
    }
  }
  
  async start() {
    console.log("\n🚀 Iniciando Bot...\n");
    await this.client.initialize();
  }

  private showInfo() {
    console.log("\n══════════════════════════════");
    console.log("🤖 BOT ONLINE");
    console.log("Grupo:", config.groupName, "(ou identificado automaticamente)");
    console.log("\nComandos:");
    console.log("!lancar");
    console.log("!saldo");
    console.log("!ajuda");
    console.log("══════════════════════════════\n");
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    console.log("\nEncerrando bot...");
    await this.client.destroy();
  }
}
