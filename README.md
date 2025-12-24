# Calorie Tracker for ChatGPT

A conversational nutrition tracking app built for the [ChatGPT App Directory](https://help.openai.com/en/articles/11487775-apps-in-chatgpt). Track your meals, monitor macros, and reach your nutrition goals through natural conversation.

## Features

- **Food Search** - Search 1M+ foods from USDA FoodData Central database
- **Meal Logging** - Log breakfast, lunch, dinner, and snacks with automatic nutrition calculation
- **Daily Summaries** - View calories and macros consumed with progress toward goals
- **Weekly Reports** - Track trends over time with auto-generated insights
- **Custom Goals** - Set personalized targets for calories, protein, carbs, fat, and fiber
- **Multi-user** - Each ChatGPT user gets isolated data storage

## How It Works

This app runs as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that ChatGPT connects to. When users interact with ChatGPT, it can call these tools:

| Tool | Description |
|------|-------------|
| `search_food` | Search USDA database for foods and nutrition info |
| `log_meal` | Record a meal with foods and portions |
| `get_daily_summary` | View today's nutrition totals and goal progress |
| `get_weekly_report` | See 7-day trends and insights |
| `set_goals` | Configure daily calorie/macro targets |
| `delete_meal` | Remove a logged meal |

## Quick Start

### Prerequisites

- Node.js 20+
- Azure subscription (for Cosmos DB and Container Apps)
- [USDA API key](https://fdc.nal.usda.gov/api-key-signup.html) (free)

### Deploy to Azure

**Windows (PowerShell):**
```powershell
.\scripts\deploy.ps1 -UsdaApiKey "your-usda-api-key"
```

**Linux/macOS:**
```bash
USDA_API_KEY="your-usda-api-key" ./scripts/deploy.sh
```

The script will:
1. Create Azure resources (Cosmos DB, Container Registry, Container Apps)
2. Build and deploy the Docker image
3. Output the app URL for ChatGPT configuration

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `USDA_API_KEY` | USDA FoodData Central API key | Yes |
| `COSMOS_ENDPOINT` | Azure Cosmos DB endpoint | Yes (prod) |
| `COSMOS_KEY` | Azure Cosmos DB key | Yes (prod) |
| `COSMOS_DATABASE` | Database name | No (default: `calorie-tracker`) |
| `PORT` | Server port | No (default: `3000`) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /mcp` | MCP SSE connection |
| `POST /mcp/tools` | List available tools |
| `POST /mcp/execute` | Execute a tool |

## Tech Stack

- **Runtime:** Node.js 20, TypeScript
- **Framework:** Express
- **Database:** Azure Cosmos DB
- **MCP SDK:** @modelcontextprotocol/sdk
- **Validation:** Zod
- **Infrastructure:** Azure Bicep, Container Apps
- **External API:** USDA FoodData Central

## Project Structure

```
src/
├── server.ts        # Express + MCP server
├── models/          # TypeScript types and Zod schemas
├── services/        # Business logic (Cosmos, USDA, nutrition)
├── tools/           # MCP tool definitions and handlers
└── ui/              # React components for rich displays

infra/               # Azure Bicep templates
scripts/             # Deployment scripts
```

## Example Conversation

> **User:** I had a chicken breast and rice for lunch
>
> **ChatGPT:** *searches for "chicken breast" and "rice"*
>
> **ChatGPT:** I found those foods. Let me log your lunch:
> - Chicken breast (1 serving): 165 cal, 31g protein
> - White rice (1 serving): 206 cal, 4g protein
>
> **Total:** 371 calories, 35g protein, 45g carbs, 4g fat
>
> ---
>
> **User:** How am I doing today?
>
> **ChatGPT:** *gets daily summary*
>
> **ChatGPT:** You've consumed 1,247 of your 2,000 calorie goal (62%). You have 753 calories remaining.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
