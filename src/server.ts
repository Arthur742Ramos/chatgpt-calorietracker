import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { ServerRequest, ServerNotification } from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import { initCosmos } from "./services/cosmos.js";
import {
  handleSearchFood,
  handleLogMeal,
  handleGetDailySummary,
  handleGetWeeklyReport,
  handleSetGoals,
  handleDeleteMeal,
  handleGetGoals,
  handleGetMeals,
  handleUpdateMeal,
  handleQuickAdd,
} from "./tools/index.js";

const PORT = parseInt(process.env.PORT || "3000", 10);

// CORS configuration for ChatGPT
const ALLOWED_ORIGINS = [
  "https://chatgpt.com",
  "https://chat.openai.com",
  "https://cdn.oaistatic.com",
];

// Create MCP server factory function - creates a fresh instance per request for stateless mode
function createMcpServer() {
  const server = new McpServer(
    {
      name: "calorie-tracker",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  );

  // Register search_food tool
  server.registerTool(
    "search_food",
    {
      description:
        "Search the USDA FoodData Central database for foods and nutrition info. Always call this first to get fdcId values before logging meals.",
      inputSchema: {
        query: z.string().describe("Food name to search"),
        limit: z
          .number()
          .min(1)
          .max(25)
          .optional()
          .default(10)
          .describe("Max results 1-25, default 10"),
      },
    },
    async ({ query, limit }) => {
      const result = await handleSearchFood({ query, limit });
      return result;
    }
  );

  // Register log_meal tool
  server.registerTool(
    "log_meal",
    {
      description: "Log a meal with one or more foods from the USDA database.",
      inputSchema: {
        foods: z
          .array(
            z.object({
              fdcId: z.number().describe("USDA FoodData Central ID"),
              servings: z.number().min(0.1).describe("Number of servings"),
            })
          )
          .min(1)
          .describe("List of foods with fdcId and servings"),
        mealType: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .describe("Type of meal"),
        notes: z.string().optional().describe("Notes about the meal"),
        date: z
          .string()
          .optional()
          .describe("Date in YYYY-MM-DD format, defaults to today"),
      },
    },
    async ({ foods, mealType, notes, date }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleLogMeal(
        { foods, mealType, notes, date },
        userId
      );
      return result;
    }
  );

  // Register get_daily_summary tool
  server.registerTool(
    "get_daily_summary",
    {
      description:
        "Get calorie and macro totals for a specific day with goal progress.",
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe("Date in YYYY-MM-DD format, defaults to today"),
      },
    },
    async ({ date }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleGetDailySummary({ date }, userId);
      return result;
    }
  );

  // Register get_weekly_report tool
  server.registerTool(
    "get_weekly_report",
    {
      description: "Get a 7-day nutrition report with trends and insights.",
      inputSchema: {
        weeksAgo: z
          .number()
          .min(0)
          .max(12)
          .optional()
          .default(0)
          .describe("0 = current week, max 12"),
      },
    },
    async ({ weeksAgo }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleGetWeeklyReport({ weeksAgo }, userId);
      return result;
    }
  );

  // Register set_goals tool
  server.registerTool(
    "set_goals",
    {
      description: "Set daily nutrition targets.",
      inputSchema: {
        dailyCalories: z.number().min(500).max(10000).describe("Daily calorie goal"),
        protein: z.number().optional().describe("Grams of protein"),
        carbs: z.number().optional().describe("Grams of carbohydrates"),
        fat: z.number().optional().describe("Grams of fat"),
        fiber: z.number().optional().describe("Grams of fiber"),
      },
    },
    async ({ dailyCalories, protein, carbs, fat, fiber }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleSetGoals(
        { dailyCalories, protein, carbs, fat, fiber },
        userId
      );
      return result;
    }
  );

  // Register get_goals tool
  server.registerTool(
    "get_goals",
    {
      description:
        "Get the user's current daily nutrition goals. Check current goals before suggesting changes with set_goals.",
      inputSchema: {},
    },
    async (_args, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleGetGoals({}, userId);
      return result;
    }
  );

  // Register delete_meal tool
  server.registerTool(
    "delete_meal",
    {
      description: "Remove a previously logged meal.",
      inputSchema: {
        mealId: z.string().uuid().describe("UUID of the meal to delete"),
      },
    },
    async ({ mealId }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleDeleteMeal({ mealId }, userId);
      return result;
    }
  );

  // Register get_meals tool
  server.registerTool(
    "get_meals",
    {
      description:
        "List logged meals for a specific date or date range. Use to review what was logged, find meal IDs for update_meal, or check meal details.",
      inputSchema: {
        date: z
          .string()
          .optional()
          .describe("Date in YYYY-MM-DD format, defaults to today"),
        startDate: z.string().optional().describe("Start of date range"),
        endDate: z.string().optional().describe("End of date range"),
      },
    },
    async ({ date, startDate, endDate }, extra) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleGetMeals({ date, startDate, endDate }, userId);
      return result;
    }
  );

  // Register update_meal tool
  server.registerTool(
    "update_meal",
    {
      description:
        "Modify an existing logged meal. Fix mistakes without deleting and re-logging. Use get_meals first to find meal IDs.",
      inputSchema: {
        mealId: z.string().uuid().describe("UUID of the meal to update"),
        addFoods: z
          .array(
            z.object({
              fdcId: z.number().describe("USDA FoodData Central ID"),
              servings: z.number().min(0.1).describe("Number of servings"),
            })
          )
          .optional()
          .describe("Foods to add"),
        removeFoodIds: z
          .array(z.number())
          .optional()
          .describe("FDC IDs of foods to remove"),
        updateServings: z
          .array(
            z.object({
              fdcId: z.number().describe("USDA FoodData Central ID"),
              servings: z.number().min(0.1).describe("New servings amount"),
            })
          )
          .optional()
          .describe("Change servings for foods"),
        mealType: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .optional()
          .describe("Change meal type"),
        notes: z.string().optional().describe("Update notes"),
      },
    },
    async (
      { mealId, addFoods, removeFoodIds, updateServings, mealType, notes },
      extra
    ) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleUpdateMeal(
        { mealId, addFoods, removeFoodIds, updateServings, mealType, notes },
        userId
      );
      return result;
    }
  );

  // Register quick_add tool
  server.registerTool(
    "quick_add",
    {
      description:
        "Log calories and macros directly without searching the food database. Perfect for restaurant meals, homemade food, or items not in the USDA database.",
      inputSchema: {
        description: z
          .string()
          .describe('What you ate (e.g., "Restaurant burger")'),
        calories: z.number().min(0).describe("Total calories"),
        protein: z.number().optional().describe("Grams of protein"),
        carbs: z.number().optional().describe("Grams of carbohydrates"),
        fat: z.number().optional().describe("Grams of fat"),
        fiber: z.number().optional().describe("Grams of fiber"),
        mealType: z
          .enum(["breakfast", "lunch", "dinner", "snack"])
          .describe("Type of meal"),
        date: z
          .string()
          .optional()
          .describe("Date in YYYY-MM-DD format, defaults to today"),
        notes: z.string().optional().describe("Additional notes"),
      },
    },
    async (
      { description, calories, protein, carbs, fat, fiber, mealType, date, notes },
      extra
    ) => {
      const userId = getUserIdFromExtra(extra);
      const result = await handleQuickAdd(
        { description, calories, protein, carbs, fat, fiber, mealType, date, notes },
        userId
      );
      return result;
    }
  );

  return server;
}

// Type alias for the extra parameter
type ToolExtra = RequestHandlerExtra<ServerRequest, ServerNotification>;

// Helper to extract userId from request context
function getUserIdFromExtra(extra: ToolExtra): string {
  // In production with OAuth, the userId comes from authInfo
  // The clientId identifies the OAuth client, or we can look in extra for user-specific info
  // For now, fall back to sessionId or default
  const authUserId = extra.authInfo?.extra?.userId as string | undefined;
  return authUserId || extra.authInfo?.clientId || extra.sessionId || "default-user";
}

// Express app
export const app = express();

// Configure CORS for ChatGPT
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      // In development, allow all origins
      if (process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "mcp-session-id"],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", service: "calorie-tracker" });
});

// Serve static UI components
app.use("/ui", express.static("dist/ui"));

// MCP endpoint - POST for JSON-RPC requests (Streamable HTTP transport)
app.post("/mcp", async (req: Request, res: Response) => {
  console.log("Received POST /mcp request");

  const server = createMcpServer();

  try {
    // Create a stateless transport (sessionIdGenerator: undefined)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Connect the server to the transport
    await server.connect(transport);

    // Handle the request
    await transport.handleRequest(req, res, req.body);

    // Clean up when response closes
    res.on("close", () => {
      console.log("Request closed");
      transport.close();
      server.close();
    });
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

// MCP endpoint - GET not allowed for stateless mode
app.get("/mcp", async (_req: Request, res: Response) => {
  console.log("Received GET /mcp request");
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed. Use POST for MCP requests.",
    },
    id: null,
  });
});

// MCP endpoint - DELETE not allowed for stateless mode
app.delete("/mcp", async (_req: Request, res: Response) => {
  console.log("Received DELETE /mcp request");
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  });
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

  // Check for stdio transport (for local MCP testing with Claude Desktop etc.)
  if (process.argv.includes("--stdio")) {
    console.error("Starting MCP server with stdio transport...");
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
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
