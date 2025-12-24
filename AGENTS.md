# AGENTS

This repo deploys a Calorie Tracker API + MCP server on Azure Container Apps.
Use these notes when automating tasks in this workspace.

## Deployment
- Preferred: use `scripts/deploy.ps1` (Windows) or `scripts/deploy.sh` (bash).
- Both scripts deploy infra with Bicep and build the image using remote ACR build
  (`az acr build`), so no local Docker is required.
- Required input: USDA API key.
  - PowerShell: `scripts/deploy.ps1 -UsdaApiKey "<key>"`
  - Bash: `USDA_API_KEY="<key>" scripts/deploy.sh`
- Optional inputs: resource group, location, environment.
  - PowerShell: `-ResourceGroup`, `-Location`, `-Environment`
  - Bash: `RESOURCE_GROUP`, `LOCATION`, `ENVIRONMENT`

## Infra layout
- `infra/main.bicep` orchestrates all resources and outputs:
  - `containerRegistryLoginServer`, `containerAppUrl`, `containerAppName`, etc.
- Modules live in `infra/modules/`.
- Parameters live in `infra/parameters/`.

## Runtime endpoints
- Health: `/health`
- MCP SSE: `/mcp`
- MCP tools: `/mcp/tools`
- MCP execute: `/mcp/execute`

## MCP tools (server)
- Definitions in `src/tools/*.ts`.
- Handlers wired in `src/server.ts`.
- Adding a tool requires:
  1) tool definition + handler,
  2) export in `src/tools/index.ts`,
  3) registration in `src/server.ts`.
