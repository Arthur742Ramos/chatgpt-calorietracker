# Calorie Tracker - ChatGPT App

A nutrition tracking MCP (Model Context Protocol) server designed for the [ChatGPT App Directory](https://help.openai.com/en/articles/11487775-apps-in-chatgpt). Users can log meals, track calories and macros, set daily goals, and view weekly reports through natural conversation.

## Overview

This app provides an MCP server that ChatGPT connects to, enabling conversational food tracking. Users can search the USDA FoodData Central database, log meals with accurate nutrition data, and monitor progress toward their goals.

**Key Features:**
- Search 1M+ foods from USDA FoodData Central database
- Log meals with automatic macro calculation
- Set personalized daily calorie/macro goals
- View daily summaries and weekly reports with insights
- Track progress over time with trend analysis

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ (ES Modules) |
| Language | TypeScript 5.7+ |
| MCP SDK | @modelcontextprotocol/sdk 1.0 |
| Web Framework | Express 4.x |
| Database | Azure Cosmos DB (NoSQL) |
| Validation | Zod |
| Infrastructure | Azure Bicep |
| Container | Docker + Azure Container Apps |
| External API | USDA FoodData Central |

## Project Structure

```
src/
├── server.ts           # Main entry: Express + MCP server setup
├── models/             # Zod schemas and TypeScript types
│   ├── food.ts         # Nutrition, FoodItem, MealFoodEntry
│   ├── meal.ts         # Meal, MealType, CreateMealInput
│   ├── user-goals.ts   # UserGoals, SetGoalsInput, DEFAULT_GOALS
│   └── index.ts        # Re-exports
├── services/           # Business logic and external integrations
│   ├── cosmos.ts       # Azure Cosmos DB operations
│   ├── usda.ts         # USDA FoodData Central API client
│   ├── nutrition.ts    # Nutrition calculations and aggregations
│   └── index.ts        # Re-exports
├── tools/              # MCP tool definitions and handlers
│   ├── search-food.ts  # search_food tool
│   ├── log-meal.ts     # log_meal tool
│   ├── get-summary.ts  # get_daily_summary tool
│   ├── get-weekly-report.ts  # get_weekly_report tool
│   ├── set-goals.ts    # set_goals tool
│   ├── delete-meal.ts  # delete_meal tool
│   └── index.ts        # Tool registry and exports
└── ui/                 # React components for rich displays (optional)
    └── components/     # DailySummary, MealCard, WeeklyChart, etc.

infra/
├── main.bicep          # Main orchestration template
├── modules/            # Bicep modules for each Azure resource
│   ├── container-app.bicep
│   ├── container-apps-environment.bicep
│   ├── container-registry.bicep
│   ├── cosmos-db.bicep
│   └── log-analytics.bicep
└── parameters/         # Environment-specific parameter files
    ├── dev.bicepparam
    └── prod.bicepparam

scripts/
├── deploy.ps1          # Windows PowerShell deployment script
└── deploy.sh           # Bash deployment script
```

## MCP Tools

### search_food
Search the USDA FoodData Central database for foods and nutrition info.

**Input:**
- `query` (string, required): Food name to search
- `limit` (number, optional): Max results 1-25, default 10

**Output:** List of foods with `fdcId`, name, brand, serving size, and nutrition (calories, protein, carbs, fat)

**Usage:** Always call this first to get `fdcId` values before logging meals.

### log_meal
Log a meal with one or more foods.

**Input:**
- `foods` (array, required): List of `{ fdcId, servings }` objects
- `mealType` (string, required): "breakfast" | "lunch" | "dinner" | "snack"
- `notes` (string, optional): Notes about the meal
- `date` (string, optional): YYYY-MM-DD format, defaults to today

**Output:** Meal ID, logged foods with nutrition, and totals

### get_daily_summary
Get calorie and macro totals for a specific day with goal progress.

**Input:**
- `date` (string, optional): YYYY-MM-DD format, defaults to today

**Output:** Total nutrition, breakdown by meal type, goal progress percentages, remaining calories

### get_weekly_report
Get a 7-day nutrition report with trends and insights.

**Input:**
- `weeksAgo` (number, optional): 0 = current week, max 12

**Output:** Daily breakdown, averages, goal comparison, auto-generated insights

### set_goals
Set daily nutrition targets.

**Input:**
- `dailyCalories` (number, required): Daily calorie goal
- `protein` (number, optional): Grams of protein
- `carbs` (number, optional): Grams of carbohydrates
- `fat` (number, optional): Grams of fat
- `fiber` (number, optional): Grams of fiber

**Output:** Confirmation with macro percentage breakdown

### delete_meal
Remove a previously logged meal.

**Input:**
- `mealId` (string, required): UUID of the meal to delete

**Output:** Deleted meal details (date, type, calories, foods)

## Data Models

### Nutrition
```typescript
{
  calories: number;      // kcal
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber?: number;        // grams
  sugar?: number;        // grams
  sodium?: number;       // mg
}
```

### Meal (Cosmos DB document)
```typescript
{
  id: string;            // UUID
  userId: string;        // ChatGPT user ID
  date: string;          // YYYY-MM-DD
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foods: MealFoodEntry[];
  totals: Nutrition;
  notes?: string;
  createdAt: string;     // ISO datetime
  updatedAt?: string;
}
```

### UserGoals (Cosmos DB document)
```typescript
{
  id: string;            // Same as userId
  userId: string;
  dailyCalories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  createdAt: string;
  updatedAt?: string;
}
```

**Default Goals:** 2000 cal, 50g protein, 250g carbs, 65g fat, 25g fiber

## Cosmos DB Schema

Two containers partitioned by `/userId`:
- **meals**: Stores meal documents with foods and nutrition
- **goals**: Stores user nutrition goals (one document per user)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `COSMOS_ENDPOINT` | Azure Cosmos DB endpoint URL | Yes (production) |
| `COSMOS_KEY` | Azure Cosmos DB primary key | Yes (production) |
| `COSMOS_DATABASE` | Database name (default: `calorie-tracker`) | No |
| `USDA_API_KEY` | USDA FoodData Central API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment: development/production | No |

Get a USDA API key at: https://fdc.nal.usda.gov/api-key-signup.html

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check (returns `{ status: "healthy" }`) |
| GET | `/mcp` | SSE connection for MCP transport |
| POST | `/mcp/tools` | List available MCP tools |
| POST | `/mcp/execute` | Execute an MCP tool |
| GET | `/ui/*` | Static UI components (React) |

## Development

### Prerequisites
- Node.js 20+
- USDA API key
- Azure Cosmos DB (or emulator for local dev)

### Local Setup
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Run in development mode (hot reload)
npm run dev

# Or run MCP server with stdio transport (for testing)
npm run build && node dist/server.js --stdio
```

### Local Development with Cosmos Emulator
```bash
# Start Cosmos emulator alongside the app
docker-compose --profile local up
```

### Build
```bash
npm run build        # Compile TypeScript
npm run build:ui     # Build React UI components (Vite)
```

## Deployment

### Using Deployment Scripts (Recommended)

**Windows (PowerShell):**
```powershell
scripts/deploy.ps1 -UsdaApiKey "your-key"

# With custom options:
scripts/deploy.ps1 -UsdaApiKey "your-key" -ResourceGroup "my-rg" -Location "westus2" -Environment "prod"
```

**Linux/macOS (Bash):**
```bash
USDA_API_KEY="your-key" scripts/deploy.sh

# With custom options:
RESOURCE_GROUP="my-rg" LOCATION="westus2" ENVIRONMENT="prod" USDA_API_KEY="your-key" scripts/deploy.sh
```

Both scripts:
1. Create Azure resource group
2. Deploy Bicep infrastructure (Cosmos DB, Container Registry, Container Apps)
3. Build Docker image using ACR build (no local Docker required)
4. Deploy container to Azure Container Apps

### Manual Deployment
```bash
# Create resource group
az group create --name rg-calorie-tracker --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group rg-calorie-tracker \
  --template-file infra/main.bicep \
  --parameters infra/parameters/dev.bicepparam \
  --parameters usdaApiKey="your-key"

# Build and push image
az acr build --registry <acr-name> --image calorie-tracker:latest .
```

## Adding a New MCP Tool

1. **Create tool file** in `src/tools/`:
```typescript
// src/tools/my-tool.ts
import { z } from "zod";

export const myToolSchema = z.object({
  param1: z.string().describe("Description for ChatGPT"),
});

export type MyToolInput = z.infer<typeof myToolSchema>;

export const myToolTool = {
  name: "my_tool",
  description: "What this tool does - ChatGPT uses this to decide when to call it",
  inputSchema: {
    type: "object" as const,
    properties: {
      param1: { type: "string", description: "Description" },
    },
    required: ["param1"],
  },
};

export async function handleMyTool(input: MyToolInput, userId: string) {
  const { param1 } = myToolSchema.parse(input);
  // Implementation
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
  };
}
```

2. **Export from index** in `src/tools/index.ts`:
```typescript
export { myToolTool, myToolSchema, handleMyTool } from "./my-tool.js";
```

3. **Register in server** in `src/server.ts`:
```typescript
// Add to imports
import { myToolTool, handleMyTool } from "./tools/index.js";

// Add to ListToolsRequestSchema handler
tools: [..., myToolTool]

// Add to CallToolRequestSchema handler switch
case "my_tool":
  return await handleMyTool(args as Parameters<typeof handleMyTool>[0], userId);
```

## Testing

### Test MCP Server Locally
```bash
# With stdio transport
npm run build && node dist/server.js --stdio

# With HTTP transport
npm run dev
# Then test: curl http://localhost:3000/health
```

### Test Tool Execution
```bash
curl -X POST http://localhost:3000/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "search_food", "arguments": {"query": "apple"}}'
```

## Architecture Notes

- **User isolation**: All data is partitioned by `userId` from the ChatGPT session
- **Stateless server**: All state is in Cosmos DB; server can scale horizontally
- **MCP transport**: Supports both HTTP/SSE (production) and stdio (testing)
- **USDA integration**: Food data comes from USDA FoodData Central, covering branded, foundation, and survey foods
- **Nutrition calculation**: Serving sizes are normalized to grams; nutrition scales linearly with servings

## Common Patterns

### Error Handling
All tool handlers return `{ content: [...], isError?: true }`. Errors are caught at the server level and formatted consistently.

### Date Handling
- All dates are stored as `YYYY-MM-DD` strings
- Timestamps use ISO 8601 format
- Default to user's "today" when date not specified

### Nutrition Aggregation
- Use `calculateTotalNutrition()` for summing food entries
- Use `scaleNutrition()` when adjusting for servings
- Use `aggregateMealsNutrition()` for multi-meal totals
