import { WhatsAppBot } from "./services/WhatsAppBot";

async function main() {
  const bot = new WhatsAppBot();

  // Tratamento de sinais para encerramento gracioso
  process.on("SIGINT", async () => {
    console.log("\n\n🛑 Recebido sinal de interrupção...");
    await bot.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.log("\n\n🛑 Recebido sinal de término...");
    await bot.stop();
    process.exit(0);
  });

  // Tratamento de erros não capturados
  process.on("uncaughtException", (error) => {
    console.error("❌ Erro não capturado:", error);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("❌ Promise rejeitada não tratada:", reason);
  });

  // Inicia o bot
  try {
    await bot.start();
  } catch (error) {
    console.error("❌ Erro ao iniciar o bot:", error);
    process.exit(1);
  }
}

main();
