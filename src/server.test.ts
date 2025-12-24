import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./server.js";

describe("API endpoints", () => {
  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "healthy",
        service: "calorie-tracker",
      });
    });
  });

  describe("POST /mcp/tools", () => {
    it("should return list of available tools", async () => {
      const response = await request(app).post("/mcp/tools");

      expect(response.status).toBe(200);
      expect(response.body.tools).toBeDefined();
      expect(Array.isArray(response.body.tools)).toBe(true);
      expect(response.body.tools.length).toBeGreaterThan(0);
    });

    it("should include expected tool names", async () => {
      const response = await request(app).post("/mcp/tools");

      const toolNames = response.body.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain("search_food");
      expect(toolNames).toContain("log_meal");
      expect(toolNames).toContain("get_daily_summary");
      expect(toolNames).toContain("get_weekly_report");
      expect(toolNames).toContain("set_goals");
      expect(toolNames).toContain("delete_meal");
      expect(toolNames).toContain("get_goals");
      expect(toolNames).toContain("get_meals");
      expect(toolNames).toContain("update_meal");
      expect(toolNames).toContain("quick_add");
    });

    it("should return 10 tools total", async () => {
      const response = await request(app).post("/mcp/tools");
      expect(response.body.tools.length).toBe(10);
    });

    it("should return tools with required properties", async () => {
      const response = await request(app).post("/mcp/tools");

      for (const tool of response.body.tools) {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
      }
    });
  });

  describe("POST /mcp/execute", () => {
    it("should return error for unknown tool", async () => {
      const response = await request(app)
        .post("/mcp/execute")
        .send({ tool: "unknown_tool", arguments: {} });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Unknown tool");
    });

    it("should handle missing tool parameter", async () => {
      const response = await request(app)
        .post("/mcp/execute")
        .send({ arguments: {} });

      expect(response.status).toBe(400);
    });
  });

  describe("OPTIONS *", () => {
    it("should handle CORS preflight requests", async () => {
      const response = await request(app).options("/mcp/execute");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe("*");
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
    });
  });

  describe("GET /mcp", () => {
    it("should return SSE headers", async () => {
      const response = await request(app)
        .get("/mcp")
        .buffer(false)
        .parse((res, callback) => {
          // Don't wait for full response, just check headers
          res.on("data", () => {
            (res as NodeJS.ReadableStream & { destroy?: () => void }).destroy?.();
          });
          callback(null, {});
        });

      expect(response.headers["content-type"]).toContain("text/event-stream");
      expect(response.headers["cache-control"]).toBe("no-cache");
    });
  });
});
