@description('Environment name (dev, staging, prod)')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Location for all resources')
param location string = resourceGroup().location

@description('Base name for resources')
param baseName string = 'calorietracker'

@description('Container image tag')
param imageTag string = 'latest'

@description('USDA API key')
@secure()
param usdaApiKey string

// Generate unique suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id)
var resourcePrefix = '${baseName}-${environment}'

// Tags for all resources
var tags = {
  environment: environment
  application: 'calorie-tracker'
  managedBy: 'bicep'
}

// Log Analytics Workspace
module logAnalytics 'modules/log-analytics.bicep' = {
  name: 'logAnalytics'
  params: {
    name: '${resourcePrefix}-logs-${uniqueSuffix}'
    location: location
    tags: tags
  }
}

// Container Registry
module containerRegistry 'modules/container-registry.bicep' = {
  name: 'containerRegistry'
  params: {
    name: '${replace(baseName, '-', '')}${environment}${uniqueSuffix}'
    location: location
    tags: tags
    sku: 'Premium'
  }
}

// Cosmos DB
module cosmosDb 'modules/cosmos-db.bicep' = {
  name: 'cosmosDb'
  params: {
    accountName: '${resourcePrefix}-cosmos-${uniqueSuffix}'
    location: location
    tags: tags
    databaseName: 'calorie-tracker'
  }
}

// Container Apps Environment
module containerAppsEnv 'modules/container-apps-environment.bicep' = {
  name: 'containerAppsEnvironment'
  params: {
    name: '${resourcePrefix}-env'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
    logAnalyticsCustomerId: logAnalytics.outputs.customerId
    logAnalyticsSharedKey: logAnalytics.outputs.sharedKey
  }
}

// Container App
module containerApp 'modules/container-app.bicep' = {
  name: 'containerApp'
  params: {
    name: '${resourcePrefix}-app'
    location: location
    tags: tags
    containerAppsEnvironmentId: containerAppsEnv.outputs.id
    containerImage: '${containerRegistry.outputs.loginServer}/calorie-tracker:${imageTag}'
    containerRegistryLoginServer: containerRegistry.outputs.loginServer
    containerRegistryUsername: containerRegistry.outputs.adminUsername
    containerRegistryPassword: containerRegistry.outputs.adminPassword
    cosmosEndpoint: cosmosDb.outputs.endpoint
    cosmosKey: cosmosDb.outputs.primaryKey
    cosmosDatabase: cosmosDb.outputs.databaseName
    usdaApiKey: usdaApiKey
  }
}

// Outputs
output resourceGroupName string = resourceGroup().name
output containerRegistryLoginServer string = containerRegistry.outputs.loginServer
output containerAppUrl string = containerApp.outputs.url
output containerAppFqdn string = containerApp.outputs.fqdn
output containerAppName string = containerApp.outputs.name
output cosmosDbEndpoint string = cosmosDb.outputs.endpoint
output cosmosDbDatabase string = cosmosDb.outputs.databaseName
