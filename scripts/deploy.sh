#!/bin/bash
set -e

# Configuration
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-calorie-tracker}"
LOCATION="${LOCATION:-eastus}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
USDA_API_KEY="${USDA_API_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Calorie Tracker Deployment ===${NC}"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Environment: $ENVIRONMENT"

# Check if USDA API key is provided
if [ -z "$USDA_API_KEY" ]; then
    echo -e "${RED}Error: USDA_API_KEY environment variable is required${NC}"
    echo "Get your API key at: https://fdc.nal.usda.gov/api-key-signup.html"
    exit 1
fi

# Check if logged into Azure
echo -e "\n${YELLOW}Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
    echo "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "Using subscription: $SUBSCRIPTION"

# Create resource group if it doesn't exist
echo -e "\n${YELLOW}Creating resource group...${NC}"
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output none

# Deploy Bicep template
echo -e "\n${YELLOW}Deploying infrastructure...${NC}"
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file ./infra/main.bicep \
    --parameters ./infra/parameters/${ENVIRONMENT}.bicepparam \
    --parameters usdaApiKey="$USDA_API_KEY" \
    --query properties.outputs \
    --output json)

# Extract outputs
ACR_LOGIN_SERVER=$(echo $DEPLOYMENT_OUTPUT | jq -r '.containerRegistryLoginServer.value')
APP_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.containerAppUrl.value')
CONTAINER_APP_NAME=$(echo $DEPLOYMENT_OUTPUT | jq -r '.containerAppName.value')

echo -e "\n${GREEN}Infrastructure deployed successfully!${NC}"
echo "Container Registry: $ACR_LOGIN_SERVER"
echo "App URL: $APP_URL"

# Build and push Docker image using ACR build (no local Docker required)
echo -e "\n${YELLOW}Building and pushing Docker image (ACR build)...${NC}"
ACR_NAME=$(echo $ACR_LOGIN_SERVER | cut -d. -f1)
az acr build --registry "$ACR_NAME" --image calorie-tracker:latest .

echo -e "\n${YELLOW}Updating Container App to latest image...${NC}"
az containerapp update \
    --name "$CONTAINER_APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --image "$ACR_LOGIN_SERVER/calorie-tracker:latest" \
    --output none

echo -e "\n${GREEN}=== Deployment Complete ===${NC}"
echo "Your Calorie Tracker app is available at:"
echo -e "${GREEN}$APP_URL${NC}"
echo ""
echo "MCP Endpoint: $APP_URL/mcp"
echo "Health Check: $APP_URL/health"
