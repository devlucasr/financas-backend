import { Client, LocalAuth, Message } from "whatsapp-web.js";
import QRCode from "qrcode";
import { CommandHandler } from "./CommandHandler";
import { DatabaseService } from "../database/supabase";
import { config } from "../config/config";
import path from "path";
import fs from "fs";

export class WhatsAppBot {

  private client: Client;
  private commandHandler: CommandHandler;
  private db: DatabaseService;
  private groupId: string | null = null;

  constructor() {

    const chromePath = this.getChromePath();
    const authPath = this.getAuthPath();

    console.log("Chrome Path:", chromePath || "Padrão");
    console.log("Auth Path:", authPath);

    this.client = new Client({

      authStrategy: new LocalAuth({
        dataPath: authPath
      }),

      puppeteer: {

        headless: true,

        executablePath: chromePath,

        args: [

          "--no-sandbox",
          
          "--disable-setuid-sandbox",
          
          "--disable-dev-shm-usage",
          
          "--disable-gpu",
          
          "--no-zygote",
          
          "--single-process",
          
          "--disable-features=site-per-process",
          
          "--disable-extensions"
          
          ],

        timeout: 60000

      }

    });

    this.commandHandler = new CommandHandler();
    this.db = new DatabaseService();

    this.setupEvents();
  }


  private setupEvents() {

    // QR CODE
    this.client.on("qr", async (qr) => {

      const url = await QRCode.toDataURL(qr);

      console.log("\n🔐 ESCANEIE O QR CODE:\n");
      console.log(url, "\n");

    });


    // READY
    this.client.on("ready", async () => {

      console.log("✅ Bot conectado!");

      try {

        const chats = await this.client.getChats();

        const groups = chats.filter((c) => c.isGroup);

        if (groups.length > 0) {

          console.log("\n📋 Grupos encontrados:");

          groups.forEach((g) =>
            console.log("-", g.name)
          );

        }


        const targetGroup = groups.find(
          (g) => g.name === config.groupName
        );


        if (targetGroup) {

          this.groupId = targetGroup.id._serialized;

          console.log(`\n✅ Grupo encontrado: ${targetGroup.name}`);

        }

        else {

          console.log(
            `\n⚠️ Grupo "${config.groupName}" não encontrado agora.`
          );

          console.log(
            "Será identificado automaticamente na primeira mensagem."
          );

        }

      }

      catch (err: any) {

        console.log(
          "⚠️ Não foi possível listar grupos:",
          err.message
        );

      }

      this.showInfo();

    });


    // AUTH
    this.client.once(
      "authenticated",
      () => console.log("✅ Autenticado!")
    );


    this.client.on(
      "auth_failure",
      (msg) => console.log("❌ Falha auth:", msg)
    );


    // DISCONNECT
    this.client.on(
      "disconnected",
      async (reason) => {

        console.log("⚠️ Desconectado:", reason);

        await this.delay(5000);

        await this.client.initialize();

      }
    );


    // MESSAGE
    this.client.on("message_create", async (message) => {

      try {
    
        if (!message.body)
          return;
    
        const chat = await message.getChat();
    
        console.log("DEBUG MSG:", chat.name, message.body);
    
    
        if (
          chat.isGroup &&
          chat.name === config.groupName
        ) {
    
          await this.commandHandler.handleCommand(message);
    
        }
    
      }
    
      catch (err) {
    
        console.error(err);
    
      }
    
    });

  }



  private async handleMessage(
    message: Message
  ) {

    try {

      if (!message?.body)
        return;


      const chat = await message.getChat();

      const body = message.body.trim();

      const userId =
        message.author ||
        message.from;


      if (!userId)
        return;



      // Detecta grupo automaticamente
      if (
        !this.groupId &&
        chat.isGroup &&
        chat.name === config.groupName
      ) {

        this.groupId =
          chat.id._serialized;

        console.log(
          `✅ Grupo identificado automaticamente`
        );

      }



      if (
        !this.groupId ||
        chat.id._serialized !== this.groupId
      )
        return;



      // Anti loop
      const botPrefixes = [

        "💰",
        "📊",
        "📤",
        "📥",
        "🤖",
        "✅",
        "❌",
        "💵",
        "🏷️"

      ];


      if (
        botPrefixes.some(
          prefix => body.includes(prefix)
        )
      )
        return;



      let userName = "Usuário";


      try {

        const contact =
          await message.getContact();

        userName =
          contact.pushname ||
          contact.name ||
          userName;

      }

      catch {

        userName =
          userId.split("@")[0];

      }


      console.log(
        `📨 ${userName}: ${body}`
      );



      await this.commandHandler.handleCommand(
        message
      );

    }

    catch (error) {

      console.error(
        "❌ Erro mensagem:",
        error
      );

    }

  }




  async start() {

    console.log("\n🚀 Iniciando BOT...\n");

    await this.client.initialize();

  }




  async stop() {

    console.log("\n🛑 Encerrando BOT...\n");

    await this.client.destroy();

  }




  private delay(ms: number) {

    return new Promise(
      resolve => setTimeout(resolve, ms)
    );

  }




  private showInfo() {

    console.log("\n════════════════════");

    console.log("🤖 BOT ONLINE");

    console.log(
      "Grupo:",
      config.groupName
    );

    console.log("\nComandos:");

    console.log("!lancar");

    console.log("!saldo");

    console.log("!ajuda");

    console.log("════════════════════\n");

  }



  /**
   *
   * CHROME PATH
   *
   * Funciona:
   *
   * Windows
   * Linux
   * Railway
   *
   */
  private getChromePath():
    string | undefined {


    if (
      process.env.PUPPETEER_EXECUTABLE_PATH
    ) {

      console.log(
        "🌍 Chrome Railway detectado"
      );

      return process.env
        .PUPPETEER_EXECUTABLE_PATH;

    }



    if (
      process.platform === "win32"
    ) {

      const winPath =
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";


      if (
        fs.existsSync(winPath)
      ) {

        console.log(
          "💻 Chrome Windows detectado"
        );

        return winPath;

      }

    }



    if (
      process.platform === "linux"
    ) {

      const paths = [

        "/usr/bin/google-chrome",

        "/usr/bin/chromium-browser",

        "/usr/bin/chromium"

      ];


      for (const p of paths) {

        if (
          fs.existsSync(p)
        ) {

          console.log(
            "🐧 Chrome Linux detectado"
          );

          return p;

        }

      }

    }


    console.log(
      "⚠️ Chrome padrão Puppeteer"
    );


    return undefined;

  }



  /**
   *
   * AUTH PATH
   *
   * Railway precisa usar /tmp
   *
   */
  private getAuthPath() {


    if (
      process.env.RAILWAY_ENVIRONMENT
    ) {

      const dir =
        "/tmp/.wwebjs_auth";


      if (!fs.existsSync(dir))
        fs.mkdirSync(dir, {
          recursive: true
        });


      console.log(
        "🌍 Auth Railway"
      );

      return dir;

    }


    const local =
      path.join(
        process.cwd(),
        ".wwebjs_auth"
      );


    if (!fs.existsSync(local))
      fs.mkdirSync(local, {
        recursive: true
      });


    console.log(
      "💻 Auth Local"
    );


    return local;

  }

}