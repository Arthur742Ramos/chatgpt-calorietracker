# PowerShell deployment script for Windows

param(
    [string]$ResourceGroup = "rg-calorie-tracker",
    [string]$Location = "eastus",
    [string]$Environment = "dev",
    [Parameter(Mandatory=$true)]
    [string]$UsdaApiKey
)

$ErrorActionPreference = "Stop"

Write-Host "=== Calorie Tracker Deployment ===" -ForegroundColor Green
Write-Host "Resource Group: $ResourceGroup"
Write-Host "Location: $Location"
Write-Host "Environment: $Environment"

# Check if logged into Azure
Write-Host "`nChecking Azure login..." -ForegroundColor Yellow
try {
    $account = az account show | ConvertFrom-Json
    Write-Host "Using subscription: $($account.name)"
} catch {
    Write-Host "Not logged into Azure. Please run 'az login' first." -ForegroundColor Red
    exit 1
}

# Create resource group if it doesn't exist
Write-Host "`nCreating resource group..." -ForegroundColor Yellow
az group create `
    --name $ResourceGroup `
    --location $Location `
    --output none

# Deploy Bicep template
Write-Host "`nDeploying infrastructure..." -ForegroundColor Yellow
$deploymentOutput = az deployment group create `
    --resource-group $ResourceGroup `
    --template-file ./infra/main.bicep `
    --parameters "./infra/parameters/$Environment.bicepparam" `
    --parameters usdaApiKey=$UsdaApiKey `
    --query properties.outputs `
    --output json | ConvertFrom-Json

# Extract outputs
$acrLoginServer = $deploymentOutput.containerRegistryLoginServer.value
$appUrl = $deploymentOutput.containerAppUrl.value
$containerAppName = $deploymentOutput.containerAppName.value

Write-Host "`nInfrastructure deployed successfully!" -ForegroundColor Green
Write-Host "Container Registry: $acrLoginServer"
Write-Host "App URL: $appUrl"

# Build and push Docker image using ACR build (no local Docker required)
Write-Host "`nBuilding and pushing Docker image (ACR build)..." -ForegroundColor Yellow

$acrName = $acrLoginServer.Split('.')[0]
az acr build --registry $acrName --image calorie-tracker:latest .

Write-Host "`nUpdating Container App to latest image..." -ForegroundColor Yellow
az containerapp update `
    --name $containerAppName `
    --resource-group $ResourceGroup `
    --image "$acrLoginServer/calorie-tracker:latest" `
    --output none

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Your Calorie Tracker app is available at:"
Write-Host $appUrl -ForegroundColor Green
Write-Host ""
Write-Host "MCP Endpoint: $appUrl/mcp"
Write-Host "Health Check: $appUrl/health"
