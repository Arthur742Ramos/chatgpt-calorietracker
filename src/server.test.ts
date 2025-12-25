import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "./server.js";

// MCP Streamable HTTP transport requires these headers
const MCP_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

// Helper to parse MCP response which can be SSE or JSON
function parseMcpResponse(response: { headers: Record<string, string>; text: string; body: unknown }) {
  const contentType = response.headers["content-type"];

  if (contentType?.includes("text/event-stream")) {
    // Parse SSE format: "event: message\ndata: {...}\n\n"
    const lines = response.text.split("\n");
    const dataLine = lines.find((l: string) => l.startsWith("data: "));
    if (dataLine) {
      return JSON.parse(dataLine.slice(6));
    }
    return null;
  }

  return response.body;
}

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

  describe("MCP Streamable HTTP Transport", () => {
    describe("POST /mcp", () => {
      it("should handle MCP initialize request", async () => {
        const initRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0",
            },
          },
        };

        const response = await request(app)
          .post("/mcp")
          .set(MCP_HEADERS)
          .send(initRequest);

        expect(response.status).toBe(200);
        const result = parseMcpResponse(response);

        expect(result.jsonrpc).toBe("2.0");
        expect(result.id).toBe(1);
        expect(result.result).toBeDefined();
        expect(result.result.serverInfo).toBeDefined();
        expect(result.result.serverInfo.name).toBe("calorie-tracker");
      });

      it("should handle tools/list request", async () => {
        // First initialize
        const initRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        };
        await request(app).post("/mcp").set(MCP_HEADERS).send(initRequest);

        // Then list tools
        const listToolsRequest = {
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {},
        };

        const response = await request(app)
          .post("/mcp")
          .set(MCP_HEADERS)
          .send(listToolsRequest);

        expect(response.status).toBe(200);
        const result = parseMcpResponse(response);
        expect(result.result).toBeDefined();
        expect(result.result.tools).toBeDefined();
        expect(Array.isArray(result.result.tools)).toBe(true);
      });

      it("should return all 10 tools", async () => {
        const listToolsRequest = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {},
        };

        const response = await request(app)
          .post("/mcp")
          .set(MCP_HEADERS)
          .send(listToolsRequest);

        expect(response.status).toBe(200);
        const result = parseMcpResponse(response);
        const tools = result.result.tools;
        expect(tools.length).toBe(10);

        const toolNames = tools.map((t: { name: string }) => t.name);
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

      it("should return error for invalid JSON-RPC request", async () => {
        const response = await request(app)
          .post("/mcp")
          .set(MCP_HEADERS)
          .send({ invalid: "request" });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      });
    });

    describe("GET /mcp", () => {
      it("should return 405 Method Not Allowed for stateless mode", async () => {
        const response = await request(app).get("/mcp");

        expect(response.status).toBe(405);
        expect(response.body.jsonrpc).toBe("2.0");
        expect(response.body.error).toBeDefined();
        expect(response.body.error.message).toContain("Method not allowed");
      });
    });

    describe("DELETE /mcp", () => {
      it("should return 405 Method Not Allowed", async () => {
        const response = await request(app).delete("/mcp");

        expect(response.status).toBe(405);
        expect(response.body.jsonrpc).toBe("2.0");
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe("CORS", () => {
    it("should allow ChatGPT origins", async () => {
      const response = await request(app)
        .post("/mcp")
        .set("Origin", "https://chatgpt.com")
        .set(MCP_HEADERS)
        .send({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
          },
        });

      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://chatgpt.com"
      );
    });

    it("should handle CORS preflight for /mcp", async () => {
      const response = await request(app)
        .options("/mcp")
        .set("Origin", "https://chatgpt.com")
        .set("Access-Control-Request-Method", "POST");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        "https://chatgpt.com"
      );
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
    });
  });
});
