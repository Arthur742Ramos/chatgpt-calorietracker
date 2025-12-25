import { CosmosClient, Container, Database } from "@azure/cosmos";
import { Meal, UserGoals } from "../models/index.js";

const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT!;
const COSMOS_KEY = process.env.COSMOS_KEY!;
const COSMOS_DATABASE = process.env.COSMOS_DATABASE || "calorie-tracker";

let client: CosmosClient;
let database: Database;
let mealsContainer: Container;
let goalsContainer: Container;

// Container cache for dynamic access
const containerCache: Map<string, Container> = new Map();

export async function initCosmos(): Promise<void> {
  client = new CosmosClient({
    endpoint: COSMOS_ENDPOINT,
    key: COSMOS_KEY,
  });

  // Create database if not exists
  const { database: db } = await client.databases.createIfNotExists({
    id: COSMOS_DATABASE,
  });
  database = db;

  // Create containers if not exist
  const { container: meals } = await database.containers.createIfNotExists({
    id: "meals",
    partitionKey: { paths: ["/userId"] },
  });
  mealsContainer = meals;
  containerCache.set("meals", meals);

  const { container: goals } = await database.containers.createIfNotExists({
    id: "goals",
    partitionKey: { paths: ["/userId"] },
  });
  goalsContainer = goals;
  containerCache.set("goals", goals);

  // OAuth containers - partitioned by id (client_id or token)
  const { container: oauthClients } = await database.containers.createIfNotExists({
    id: "oauth_clients",
    partitionKey: { paths: ["/id"] },
  });
  containerCache.set("oauth_clients", oauthClients);

  const { container: oauthTokens } = await database.containers.createIfNotExists({
    id: "oauth_tokens",
    partitionKey: { paths: ["/id"] },
  });
  containerCache.set("oauth_tokens", oauthTokens);

  const { container: oauthCodes } = await database.containers.createIfNotExists({
    id: "oauth_codes",
    partitionKey: { paths: ["/id"] },
  });
  containerCache.set("oauth_codes", oauthCodes);

  console.log("Cosmos DB initialized successfully");
}

/**
 * Get a container by name. Creates if not exists.
 */
export function getContainer(containerName: string): Container {
  const cached = containerCache.get(containerName);
  if (cached) {
    return cached;
  }

  if (!database) {
    throw new Error("Cosmos DB not initialized. Call initCosmos() first.");
  }

  // For containers not in cache, get reference (assumes exists)
  const container = database.container(containerName);
  containerCache.set(containerName, container);
  return container;
}

// ============ Meals Operations ============

export async function createMeal(meal: Meal): Promise<Meal> {
  const { resource } = await mealsContainer.items.create(meal);
  return resource as Meal;
}

export async function getMealById(
  userId: string,
  mealId: string
): Promise<Meal | null> {
  try {
    const { resource } = await mealsContainer
      .item(mealId, userId)
      .read<Meal>();
    return resource || null;
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 404) {
      return null;
    }
    throw error;
  }
}

export async function getMealsByDate(
  userId: string,
  date: string
): Promise<Meal[]> {
  const query = {
    query: "SELECT * FROM c WHERE c.userId = @userId AND c.date = @date",
    parameters: [
      { name: "@userId", value: userId },
      { name: "@date", value: date },
    ],
  };

  const { resources } = await mealsContainer.items
    .query<Meal>(query)
    .fetchAll();
  return resources;
}

export async function getMealsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Meal[]> {
  const query = {
    query:
      "SELECT * FROM c WHERE c.userId = @userId AND c.date >= @startDate AND c.date <= @endDate ORDER BY c.date DESC",
    parameters: [
      { name: "@userId", value: userId },
      { name: "@startDate", value: startDate },
      { name: "@endDate", value: endDate },
    ],
  };

  const { resources } = await mealsContainer.items
    .query<Meal>(query)
    .fetchAll();
  return resources;
}

export async function updateMeal(meal: Meal): Promise<Meal> {
  const { resource } = await mealsContainer.items.upsert<Meal>(meal);
  return resource!;
}

export async function deleteMeal(
  userId: string,
  mealId: string
): Promise<boolean> {
  try {
    await mealsContainer.item(mealId, userId).delete();
    return true;
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 404) {
      return false;
    }
    throw error;
  }
}

// ============ Goals Operations ============

export async function getUserGoals(userId: string): Promise<UserGoals | null> {
  try {
    const { resource } = await goalsContainer
      .item(userId, userId)
      .read<UserGoals>();
    return resource || null;
  } catch (error: unknown) {
    if ((error as { code?: number }).code === 404) {
      return null;
    }
    throw error;
  }
}

export async function setUserGoals(goals: UserGoals): Promise<UserGoals> {
  const { resource } = await goalsContainer.items.upsert<UserGoals>(goals);
  return resource!;
}
