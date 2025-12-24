import { FoodItem, Nutrition } from "../models/index.js";

const USDA_API_KEY = process.env.USDA_API_KEY!;
const USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

interface USDAFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDAFoodNutrient[];
}

interface USDASearchResponse {
  foods: USDAFood[];
  totalHits: number;
}

// Nutrient IDs from USDA database
const NUTRIENT_IDS = {
  calories: 1008, // Energy (kcal)
  protein: 1003, // Protein
  carbs: 1005, // Carbohydrate, by difference
  fat: 1004, // Total lipid (fat)
  fiber: 1079, // Fiber, total dietary
  sugar: 2000, // Sugars, total
  sodium: 1093, // Sodium, Na
};

function extractNutrition(nutrients: USDAFoodNutrient[]): Nutrition {
  const getNutrientValue = (id: number): number => {
    const nutrient = nutrients.find((n) => n.nutrientId === id);
    return nutrient?.value || 0;
  };

  return {
    calories: Math.round(getNutrientValue(NUTRIENT_IDS.calories)),
    protein: Math.round(getNutrientValue(NUTRIENT_IDS.protein) * 10) / 10,
    carbs: Math.round(getNutrientValue(NUTRIENT_IDS.carbs) * 10) / 10,
    fat: Math.round(getNutrientValue(NUTRIENT_IDS.fat) * 10) / 10,
    fiber: Math.round(getNutrientValue(NUTRIENT_IDS.fiber) * 10) / 10,
    sugar: Math.round(getNutrientValue(NUTRIENT_IDS.sugar) * 10) / 10,
    sodium: Math.round(getNutrientValue(NUTRIENT_IDS.sodium)),
  };
}

function mapUSDAFood(food: USDAFood): FoodItem {
  return {
    fdcId: food.fdcId,
    description: food.description,
    brandName: food.brandName,
    servingSize: food.servingSize || 100,
    servingSizeUnit: food.servingSizeUnit || "g",
    nutrition: extractNutrition(food.foodNutrients),
  };
}

export async function searchFoods(
  query: string,
  pageSize: number = 10
): Promise<FoodItem[]> {
  const url = new URL(`${USDA_BASE_URL}/foods/search`);
  url.searchParams.set("api_key", USDA_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", pageSize.toString());
  // Prioritize branded and survey foods for better serving size info
  url.searchParams.set(
    "dataType",
    "Foundation,SR Legacy,Branded,Survey (FNDDS)"
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as USDASearchResponse;
  return data.foods.map(mapUSDAFood);
}

export async function getFoodById(fdcId: number): Promise<FoodItem | null> {
  const url = new URL(`${USDA_BASE_URL}/food/${fdcId}`);
  url.searchParams.set("api_key", USDA_API_KEY);
  url.searchParams.set(
    "nutrients",
    Object.values(NUTRIENT_IDS).join(",")
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }

  const food = (await response.json()) as USDAFood;
  return mapUSDAFood(food);
}

export async function getFoodsByIds(fdcIds: number[]): Promise<FoodItem[]> {
  if (fdcIds.length === 0) return [];

  const url = new URL(`${USDA_BASE_URL}/foods`);
  url.searchParams.set("api_key", USDA_API_KEY);
  url.searchParams.set(
    "nutrients",
    Object.values(NUTRIENT_IDS).join(",")
  );

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fdcIds }),
  });

  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }

  const foods = (await response.json()) as USDAFood[];
  return foods.map(mapUSDAFood);
}
