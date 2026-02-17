# 🤖 Bot Financeiro WhatsApp - Interativo

> **Sistema profissional de controle financeiro via WhatsApp com comandos interativos e banco de dados na nuvem**

Bot completo para gerenciamento de finanças pessoais através de comandos no WhatsApp, com armazenamento seguro no Supabase (PostgreSQL).

---

## ✨ Funcionalidades

### 🎯 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `!lancar` | Iniciar novo lançamento (Gasto ou Entrada) com menu guiado |
| `!saldo` | Ver saldo do mês atual (Entradas - Gastos) |
| `!ajuda` | Mostrar lista de comandos disponíveis |
| `!cancelar` | Cancelar lançamento em andamento (funciona a qualquer momento) |

### 💰 Categorias de Transações

#### **GASTOS**
- 💳 Cartão de Crédito
- 📱 PIX
- 💵 Dinheiro
- 🔢 Parcelado (com controle automático de parcelas)

#### **ENTRADAS**
- 💼 Salário Lucas
- 💼 Salário Júlia
- 💰 Cartão Flash
- 💵 Extra Lucas

_(Todas as categorias são personalizáveis no arquivo `.env`)_

---

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 16 ou superior
- Conta no Supabase (grátis)
- WhatsApp no celular

### Instalação em 5 Passos

#### 1. Instalar dependências
```bash
npm install
```

#### 2. Configurar Supabase

1. Acesse: https://supabase.com
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Copie a **URL** e **anon key** do projeto

#### 3. Configurar banco de dados

```bash
npm run db:setup
```

Copie o SQL exibido, acesse o **Supabase SQL Editor** e execute.

#### 4. Configurar variáveis de ambiente

Edite o arquivo `.env`:

```env
# Nome EXATO do grupo no WhatsApp
GROUP_NAME=Financeiro dos Fernandes

# Credenciais do Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anon-aqui

# Categorias personalizadas (separadas por vírgula)
CATEGORIAS_GASTO=Cartão de Crédito,PIX,Dinheiro,Parcelado
CATEGORIAS_ENTRADA=Salário Lucas,Salário Júlia,Cartão Flash,Extra Lucas
```

#### 5. Executar o bot

```bash
npm run dev
```

Escaneie o QR Code que aparecerá no terminal com seu WhatsApp.

---

## 📱 Como Usar

### Fluxo Completo de Lançamento

#### Exemplo: Registrar um Gasto

```
Você: !lancar

Bot: 💰 NOVO LANÇAMENTO
     Escolha o tipo:
     1️⃣ GASTO
     2️⃣ ENTRADA
     
     Digite 1 ou 2
     (!cancelar para cancelar)

Você: 1

Bot: 📤 GASTO SELECIONADO
     Escolha a categoria:
     1️⃣ Cartão de Crédito
     2️⃣ PIX
     3️⃣ Dinheiro
     4️⃣ Parcelado
     
     Digite o número da categoria
     (!cancelar para cancelar)

Você: 2

Bot: 💵 PIX
     Digite o valor:
     
     Exemplos: 100 ou 150.50 ou 1500
     (!cancelar para cancelar)

Você: 150.50

Bot: ✅ GASTO REGISTRADO!
     💵 Valor: R$ 150,50
     🏷️ Categoria: PIX
     👤 Usuário: Seu Nome
     
     ✅ Lançamento salvo com sucesso!
```

#### Exemplo: Registrar Entrada

```
Você: !lancar

Bot: (menu inicial)

Você: 2

Bot: 📥 ENTRADA SELECIONADA
     Escolha a origem:
     1️⃣ Salário Lucas
     2️⃣ Salário Júlia
     3️⃣ Cartão Flash
     4️⃣ Extra Lucas

Você: 1

Bot: 💵 SALÁRIO LUCAS
     Digite o valor:

Você: 5000

Bot: ✅ ENTRADA REGISTRADA!
     💵 Valor: R$ 5.000,00
     🏷️ Categoria: Salário Lucas
     ✅ Lançamento salvo!
```

#### Exemplo: Gasto Parcelado

```
Você: !lancar
Você: 1  (GASTO)
Você: 4  (Parcelado)

Bot: 💳 PARCELADO
     Em quantas vezes será parcelado?
     
     Digite o número de parcelas (ex: 12)

Você: 12

Bot: 💵 PARCELADO EM 12X
     Digite o valor TOTAL:
     
     Exemplo: 1200 (será dividido em 12x de R$ 100,00)

Você: 1200

Bot: ✅ PARCELAMENTO REGISTRADO!
     💵 Valor Total: R$ 1.200,00
     💳 Parcelas: 12x de R$ 100,00
     ✅ 12/12 parcelas salvas!
     
     Cada parcela foi lançada em um mês diferente
```

#### Ver Saldo do Mês

```
Você: !saldo

Bot: 📊 SALDO DO MÊS
     📅 Outubro/2025
     
     📥 Entradas: R$ 9.500,00
     📤 Gastos: R$ 3.250,00
     
     ✅ Saldo: R$ 6.250,00
```

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

```
Backend:
├── Node.js 16+           → Runtime JavaScript
├── TypeScript 5.3        → Linguagem tipada
├── whatsapp-web.js       → Integração WhatsApp (QR Code)
├── @supabase/supabase-js → Cliente PostgreSQL
└── date-fns              → Manipulação de datas
```

### Estrutura do Projeto

```
financas/
├── src/
│   ├── index.ts                   # Ponto de entrada
│   ├── types/
│   │   └── Transaction.ts         # Tipos TypeScript
│   ├── config/
│   │   └── config.ts              # Configurações e validação
│   ├── database/
│   │   ├── supabase.ts            # Cliente e operações do banco
│   │   └── setup.ts               # Script SQL para criar estrutura
│   └── services/
│       ├── WhatsAppBot.ts         # Gerenciador do WhatsApp
│       └── CommandHandler.ts      # Processador de comandos
│
├── package.json
├── tsconfig.json
├── .env                           # Suas configurações
├── .gitignore
└── README.md
```

---

## 🗄️ Banco de Dados

### Supabase (PostgreSQL)

**Características:**
- ✅ 500MB storage grátis
- ✅ 2GB bandwidth/mês grátis
- ✅ Backup automático
- ✅ Dashboard web completo
- ✅ Exportação CSV/Excel
- ✅ Integrações (Power BI, Data Studio, etc)

### Estrutura da Tabela `transactions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | ID único (gerado automaticamente) |
| `tipo` | VARCHAR | GASTO ou ENTRADA |
| `categoria` | VARCHAR | Categoria da transação |
| `valor` | DECIMAL | Valor em reais |
| `parcelas` | INTEGER | Número total de parcelas (se parcelado) |
| `parcela_atual` | INTEGER | Número da parcela atual (ex: 1 de 12) |
| `descricao` | TEXT | Descrição adicional |
| `usuario` | VARCHAR | Nome do usuário que criou |
| `data` | TIMESTAMP | Data/hora da transação |
| `mes_referencia` | VARCHAR | Mês no formato YYYY-MM |
| `created_at` | TIMESTAMP | Data de criação do registro |

### Índices e Otimizações

- Índice em `mes_referencia` para consultas rápidas
- Índice em `tipo` para filtros por GASTO/ENTRADA
- Índice em `data` para ordenação cronológica
- View `monthly_summary` para relatórios
- Função SQL `get_monthly_balance()` para cálculos

---

## ⚙️ Personalização

### Alterar Categorias

Edite o arquivo `.env`:

```env
# Adicione suas próprias categorias
CATEGORIAS_GASTO=Nubank,C6 Bank,PIX,Dinheiro,Boleto,Parcelado
CATEGORIAS_ENTRADA=Salário,Freelance,Investimentos,Bônus,Outros
```

Reinicie o bot para aplicar as mudanças.

### Alterar Grupo do WhatsApp

```env
GROUP_NAME=Nome Exato Do Grupo
```

⚠️ **Importante:** O nome deve ser EXATAMENTE igual ao do WhatsApp (case-sensitive, com acentos e emojis).

**Dica:** Execute `npm run dev` e veja a lista de grupos disponíveis no terminal.

---

## 🔐 Segurança

### Dados Protegidos

✅ Dados na nuvem com backup automático (Supabase)  
✅ Sessão WhatsApp criptografada localmente  
✅ Credenciais no `.env` (não versionado)  
✅ Comunicação HTTPS com banco  

### Boas Práticas

⚠️ **Não compartilhe:** Pasta `.wwebjs_auth/` (contém sessão WhatsApp)  
⚠️ **Não compartilhe:** Arquivo `.env` (contém credenciais)  
⚠️ **Não compartilhe:** Keys do Supabase  
⚠️ **Use apenas:** Para fins pessoais (evite spam)  

---

## 🎯 Casos de Uso

### Para Casais 💑

- Controle financeiro compartilhado
- Cada um registra seus próprios gastos
- Sistema identifica automaticamente quem gastou
- Comando `!saldo` mostra resultado consolidado

### Para Famílias 👨‍👩‍👧‍👦

- Todos os membros podem lançar transações
- Transparência total das finanças
- Histórico completo no Supabase
- Relatórios e exportações disponíveis

### Para Trabalho 💼

- Controle de despesas de equipe
- Prestação de contas simplificada
- Categorização por tipo de despesa
- Dados acessíveis para análise

---

## 📊 Relatórios e Análises

### No Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Table Editor** → `transactions`
4. Visualize, filtre e exporte os dados

### Exportar para Excel

1. No Supabase, selecione os dados desejados
2. Clique em **Download** → CSV
3. Abra no Excel, Google Sheets ou LibreOffice

### Integração com BI Tools

O Supabase se integra nativamente com:
- Google Data Studio
- Power BI
- Tableau
- Metabase
- Grafana

---

## 🚀 Produção (Rodar 24/7)

### Usando PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Compilar
npm run build

# Iniciar
pm2 start dist/index.js --name financas-bot

# Configurar para iniciar com o sistema
pm2 startup
pm2 save

# Comandos úteis
pm2 logs financas-bot     # Ver logs
pm2 restart financas-bot  # Reiniciar
pm2 stop financas-bot     # Parar
pm2 delete financas-bot   # Remover
```

### Usando Docker (Opcional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

---

## 🐛 Troubleshooting

### Bot não encontra o grupo

**Solução:**
```bash
# Execute o bot e veja a lista de grupos disponíveis
npm run dev

# Copie o nome EXATO e cole no .env
nano .env
# GROUP_NAME=Nome Exato Do Grupo
```

### Erro ao conectar no Supabase

**Solução:**
1. Verifique se as credenciais estão corretas no `.env`
2. Teste a conexão no navegador: abra a `SUPABASE_URL`
3. Confirme que executou o SQL no Supabase SQL Editor

### QR Code não aparece

**Solução:**
```bash
# Limpe a sessão antiga
rm -rf .wwebjs_auth/
rm -rf .wwebjs_cache/

# Execute novamente
npm run dev
```

### Erro ao instalar no Linux

**Solução:**
```bash
sudo apt-get install -y chromium-browser libnss3 libatk1.0-0 libcups2
```

---

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev          # Roda com ts-node (hot reload)

# Produção
npm run build        # Compila TypeScript
npm start            # Executa compilado

# Banco de dados
npm run db:setup     # Mostra SQL para criar estrutura

# Limpeza
npm run clean        # Remove pasta dist/
```

---

## 🌟 Diferenciais

✅ **100% Interativo** - Menu guiado, não precisa decorar formatos  
✅ **Banco Relacional** - PostgreSQL profissional (não é planilha!)  
✅ **Controle de Parcelas** - Registra cada parcela automaticamente  
✅ **Multi-usuário** - Perfeito para casais e famílias  
✅ **Cancelamento Flexível** - `!cancelar` funciona a qualquer momento  
✅ **Dados na Nuvem** - Acesse de qualquer lugar  
✅ **Grátis** - Supabase free tier é generoso  
✅ **Profissional** - Código TypeScript, arquitetura escalável  

---

## 📄 Licença

MIT License - Uso livre

---

## 🎓 Tecnologias e Conceitos

### Padrões Utilizados

- **Service Layer Pattern** - Separação de responsabilidades
- **Event-Driven Architecture** - Listeners do WhatsApp
- **Session Management** - Controle de estado do usuário
- **Configuration Management** - Centralização via `.env`

### Boas Práticas

- TypeScript com tipagem estrita
- Tratamento de erros em todas as operações
- Validação de dados antes de salvar
- Logs informativos para debug
- Código modular e testável

---

## 💡 Dicas de Uso

### Para Melhor Experiência

1. 📱 **Crie um grupo específico** - "Finanças da Casa"
2. 🕐 **Lance imediatamente** - Não deixe acumular
3. 📊 **Revise semanalmente** - Use `!saldo` toda semana
4. 🎯 **Personalize categorias** - Adapte ao seu caso
5. 💾 **Explore o Supabase** - Dashboard tem muitos recursos

### Workflow Recomendado

**Diário:**
- Lance cada gasto imediatamente após fazer

**Semanal:**
- Execute `!saldo` para acompanhar
- Ajuste comportamento se necessário

**Mensal:**
- Exporte relatório do Supabase
- Analise tendências
- Planeje o próximo mês

---

## 🤝 Contribuindo

Sugestões e melhorias são bem-vindas! Este é um projeto pessoal mas aberto a contribuições.

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique este README
2. Confira o arquivo `.env.example` para referência
3. Veja os logs do terminal ao executar `npm run dev`
4. Teste a conexão com Supabase no dashboard

---

<p align="center">
  <strong>Desenvolvido com ❤️ usando Node.js + TypeScript + Supabase</strong>
</p>

<p align="center">
  <em>Controle financeiro profissional via WhatsApp</em>
</p>

<p align="center">
  <strong>⚡ Pronto para Produção ⚡</strong>
</p>
