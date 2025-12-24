import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { initCosmos } from "./services/cosmos.js";
import {
  searchFoodTool,
  handleSearchFood,
  logMealTool,
  handleLogMeal,
  getDailySummaryTool,
  handleGetDailySummary,
  getWeeklyReportTool,
  handleGetWeeklyReport,
  setGoalsTool,
  handleSetGoals,
  deleteMealTool,
  handleDeleteMeal,
  getGoalsTool,
  handleGetGoals,
  getMealsTool,
  handleGetMeals,
  updateMealTool,
  handleUpdateMeal,
  quickAddTool,
  handleQuickAdd,
} from "./tools/index.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

// MCP Server instance
const mcpServer = new Server(
  {
    name: "calorie-tracker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tools list handler
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchFoodTool,
      logMealTool,
      getDailySummaryTool,
      getWeeklyReportTool,
      setGoalsTool,
      deleteMealTool,
      getGoalsTool,
      getMealsTool,
      updateMealTool,
      quickAddTool,
    ],
  };
});

// Register tool call handler
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Extract user ID from MCP context (passed by ChatGPT)
  // In production, this comes from the ChatGPT session
  const meta = (request.params as { _meta?: { userId?: string } })._meta;
  const userId = meta?.userId || "default-user";

  try {
    switch (name) {
      case "search_food":
        return await handleSearchFood(args as Parameters<typeof handleSearchFood>[0]);

      case "log_meal":
        return await handleLogMeal(args as Parameters<typeof handleLogMeal>[0], userId);

      case "get_daily_summary":
        return await handleGetDailySummary(
          args as Parameters<typeof handleGetDailySummary>[0],
          userId
        );

      case "get_weekly_report":
        return await handleGetWeeklyReport(
          args as Parameters<typeof handleGetWeeklyReport>[0],
          userId
        );

      case "set_goals":
        return await handleSetGoals(args as Parameters<typeof handleSetGoals>[0], userId);

      case "delete_meal":
        return await handleDeleteMeal(args as Parameters<typeof handleDeleteMeal>[0], userId);

      case "get_goals":
        return await handleGetGoals(args as Parameters<typeof handleGetGoals>[0], userId);

      case "get_meals":
        return await handleGetMeals(args as Parameters<typeof handleGetMeals>[0], userId);

      case "update_meal":
        return await handleUpdateMeal(args as Parameters<typeof handleUpdateMeal>[0], userId);

      case "quick_add":
        return await handleQuickAdd(args as Parameters<typeof handleQuickAdd>[0], userId);

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text" as const,
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Express app for HTTP transport and serving UI components
export const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "calorie-tracker" });
});

// Serve static UI components
app.use("/ui", express.static("dist/ui"));

// MCP endpoint for HTTP transport (SSE)
app.get("/mcp", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Handle SSE connection
  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: "connected", server: "calorie-tracker" });

  req.on("close", () => {
    res.end();
  });
});

// MCP tools endpoint
app.post("/mcp/tools", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const tools = [
    searchFoodTool,
    logMealTool,
    getDailySummaryTool,
    getWeeklyReportTool,
    setGoalsTool,
    deleteMealTool,
    getGoalsTool,
    getMealsTool,
    updateMealTool,
    quickAddTool,
  ];

  res.json({ tools });
});

// MCP tool execution endpoint
app.post("/mcp/execute", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { tool, arguments: args, userId = "default-user" } = req.body;

  try {
    let result;

    switch (tool) {
      case "search_food":
        result = await handleSearchFood(args);
        break;
      case "log_meal":
        result = await handleLogMeal(args, userId);
        break;
      case "get_daily_summary":
        result = await handleGetDailySummary(args, userId);
        break;
      case "get_weekly_report":
        result = await handleGetWeeklyReport(args, userId);
        break;
      case "set_goals":
        result = await handleSetGoals(args, userId);
        break;
      case "delete_meal":
        result = await handleDeleteMeal(args, userId);
        break;
      case "get_goals":
        result = await handleGetGoals(args, userId);
        break;
      case "get_meals":
        result = await handleGetMeals(args, userId);
        break;
      case "update_meal":
        result = await handleUpdateMeal(args, userId);
        break;
      case "quick_add":
        result = await handleQuickAdd(args, userId);
        break;
      default:
        res.status(400).json({ error: `Unknown tool: ${tool}` });
        return;
    }

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
});

// CORS preflight
app.options("*", (_req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

// Start server
export async function main() {
  // Initialize Cosmos DB connection
  if (process.env.COSMOS_ENDPOINT && process.env.COSMOS_KEY) {
    await initCosmos();
  } else {
    console.warn(
      "Cosmos DB credentials not configured. Running without database."
    );
  }

  // Check for stdio transport (for local MCP testing)
  if (process.argv.includes("--stdio")) {
    console.error("Starting MCP server with stdio transport...");
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
  } else {
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`Calorie Tracker MCP server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });
  }
}

// Only start server when run directly (not when imported for testing)
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  main().catch(console.error);
}
