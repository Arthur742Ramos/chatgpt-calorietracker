using '../main.bicep'

param environment = 'prod'
param baseName = 'calorietracker'
param imageTag = 'latest'

// USDA API key - should be passed at deployment time
// az deployment group create ... --parameters usdaApiKey='your-key'
param usdaApiKey = ''
