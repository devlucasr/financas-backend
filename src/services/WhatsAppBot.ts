import { Client, LocalAuth, Message, Chat } from "whatsapp-web.js";
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
        dataPath: "./.wwebjs_auth"
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-extensions"
        ]
      }
    });

    this.commandHandler = new CommandHandler();
    this.db = new DatabaseService();

    this.setupEvents();

  }

  private setupEvents() {

    this.client.on("qr", async (qr) => {

      const url = await QRCode.toDataURL(qr);

      console.log("\n🔐 ESCANEIE O QR CODE:\n");
      console.log(url);
      console.log();

    });

    this.client.once("authenticated", () => {

      console.log("✅ Autenticação realizada!");

    });

    this.client.on("auth_failure", (msg) => {

      console.log("❌ Falha auth:", msg);

    });

    this.client.on("ready", async () => {

      console.log("✅ Bot conectado!");

      try {

        const chats = await this.client.getChats();

        const groups = chats.filter(c => c.isGroup);

        if (groups.length > 0) {

          console.log("📋 Grupos encontrados:");

          groups.forEach(g => console.log("-", g.name));

        }

        const target = groups.find(g => g.name === config.groupName);

        if (target) {

          this.groupId = target.id._serialized;

          console.log(`✅ Grupo encontrado: ${target.name}`);

        }
        else {

          console.log(`⚠️ Grupo "${config.groupName}" não encontrado.`);
          console.log("Será identificado automaticamente na primeira mensagem.");

        }

      }
      catch (e: any) {

        console.log("⚠️ Não foi possível listar grupos.", e.message);

      }

      this.showInfo();

    });

    this.client.on("disconnected", async (reason) => {

      console.log("⚠️ Desconectado:", reason);

      await this.delay(5000);

      await this.client.initialize();

    });

    this.client.on("message_create", async (message) => {

      await this.handleMessage(message);

    });

  }

  private async handleMessage(message: Message) {

    try {

      if (!message) return;

      if (message.from === "status@broadcast") return;

      if (!message.from) return;

      if (message.fromMe) return;

      let chat: Chat;

      try {

        chat = await message.getChat();

      }
      catch {

        return;

      }

      if (!chat) return;

      if (typeof chat.isGroup === "undefined") return;

      const body = message.body?.trim();

      if (!body) return;

      if (!this.groupId && chat.isGroup && chat.name === config.groupName) {

        this.groupId = chat.id._serialized;

        console.log(`✅ Grupo identificado automaticamente: ${chat.name}`);

      }

      if (!this.groupId) return;

      if (chat.id._serialized !== this.groupId) return;

      let userName = "Usuário";

      try {

        const contact = await message.getContact();

        userName =
          contact.pushname ||
          contact.name ||
          contact.number ||
          "Usuário";

      }
      catch {

        userName = message.from.split("@")[0];

      }

      console.log(`📨 ${userName}: ${body}`);

      await this.commandHandler.handleCommand(message);

    }
    catch (error) {

      console.error("❌ Erro crítico:", error);

    }

  }

  async start() {

    console.log("\n🚀 Iniciando Bot...\n");

    await this.client.initialize();

  }

  async stop() {

    console.log("\nEncerrando bot...\n");

    await this.client.destroy();

  }

  private showInfo() {

    console.log("\n══════════════════════════════");

    console.log("🤖 BOT ONLINE");

    console.log("Grupo:", config.groupName);

    console.log("\nComandos:");

    console.log("!lancar");
    console.log("!saldo");
    console.log("!ajuda");

    console.log("══════════════════════════════\n");

  }

  private delay(ms: number) {

    return new Promise(resolve => setTimeout(resolve, ms));

  }

}