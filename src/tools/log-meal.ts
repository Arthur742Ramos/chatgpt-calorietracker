import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { MealTypeSchema, Meal } from "../models/index.js";
import { createMeal } from "../services/cosmos.js";
import { getFoodsByIds } from "../services/usda.js";
import {
  createMealFoodEntry,
  calculateTotalNutrition,
} from "../services/nutrition.js";

export const logMealSchema = z.object({
  foods: z
    .array(
      z.object({
        fdcId: z.number().describe("USDA FoodData Central ID"),
        servings: z
          .number()
          .positive()
          .default(1)
          .describe("Number of servings"),
      })
    )
    .min(1)
    .describe("List of foods with their FDC IDs and serving counts"),
  mealType: MealTypeSchema.describe("Type of meal"),
  notes: z.string().optional().describe("Optional notes about the meal"),
  date: z
    .string()
    .optional()
    .describe("Date of meal in YYYY-MM-DD format (defaults to today)"),
});

export type LogMealInput = z.infer<typeof logMealSchema>;

export const logMealTool = {
  name: "log_meal",
  description:
    "Log a meal with foods and their portions. First use search_food to find food IDs, then use this tool to record the meal.",
  inputSchema: {
    type: "object" as const,
    properties: {
      foods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fdcId: {
              type: "number",
              description: "USDA FoodData Central ID from search_food",
            },
            servings: {
              type: "number",
              description: "Number of servings (default: 1)",
              default: 1,
            },
          },
          required: ["fdcId"],
        },
        description: "Foods to log with their IDs and serving counts",
      },
      mealType: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
        description: "Type of meal",
      },
      notes: {
        type: "string",
        description: "Optional notes about the meal",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format (defaults to today)",
      },
    },
    required: ["foods", "mealType"],
  },
};

export async function handleLogMeal(input: LogMealInput, userId: string) {
  const { foods: foodInputs, mealType, notes, date } = logMealSchema.parse(input);

  // Get food details from USDA
  const fdcIds = foodInputs.map((f) => f.fdcId);
  const foodItems = await getFoodsByIds(fdcIds);

  if (foodItems.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Could not find the specified foods. Please use search_food first to get valid food IDs.",
        },
      ],
      isError: true,
    };
  }

  // Create meal food entries
  const mealFoods = foodInputs.map((input) => {
    const food = foodItems.find((f) => f.fdcId === input.fdcId);
    if (!food) {
      throw new Error(`Food with ID ${input.fdcId} not found`);
    }
    return createMealFoodEntry(food, input.servings);
  });

  // Calculate totals
  const totals = calculateTotalNutrition(mealFoods);

  // Create meal document
  const mealDate = date || new Date().toISOString().split("T")[0];
  const meal: Meal = {
    id: uuidv4(),
    userId,
    date: mealDate,
    mealType,
    foods: mealFoods,
    totals,
    notes,
    createdAt: new Date().toISOString(),
  };

  // Save to Cosmos DB
  await createMeal(meal);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            mealId: meal.id,
            date: meal.date,
            mealType: meal.mealType,
            foodsLogged: mealFoods.map((f) => ({
              name: f.description,
              servings: f.servings,
              calories: f.nutrition.calories,
            })),
            totals: {
              calories: totals.calories,
              protein: `${totals.protein}g`,
              carbs: `${totals.carbs}g`,
              fat: `${totals.fat}g`,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
