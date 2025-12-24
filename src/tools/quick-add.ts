import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { MealTypeSchema, Meal, MealFoodEntry, Nutrition } from "../models/index.js";
import { createMeal } from "../services/cosmos.js";

export const quickAddSchema = z.object({
  description: z
    .string()
    .min(1)
    .max(200)
    .describe("Description of the food/meal (e.g., 'Restaurant burger', 'Homemade soup')"),
  calories: z
    .number()
    .positive()
    .max(10000)
    .describe("Total calories"),
  protein: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .describe("Protein in grams"),
  carbs: z
    .number()
    .min(0)
    .max(1000)
    .optional()
    .describe("Carbohydrates in grams"),
  fat: z
    .number()
    .min(0)
    .max(500)
    .optional()
    .describe("Fat in grams"),
  fiber: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Fiber in grams"),
  mealType: MealTypeSchema.describe("Type of meal"),
  date: z
    .string()
    .optional()
    .describe("Date in YYYY-MM-DD format (defaults to today)"),
  notes: z.string().optional().describe("Optional notes"),
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;

export const quickAddTool = {
  name: "quick_add",
  description:
    "Quickly log calories and macros without searching the food database. Perfect for restaurant meals, homemade food, or items not in the USDA database.",
  inputSchema: {
    type: "object" as const,
    properties: {
      description: {
        type: "string",
        description: "What you ate (e.g., 'Chipotle burrito bowl', 'Mom's lasagna')",
      },
      calories: {
        type: "number",
        description: "Total calories (required)",
      },
      protein: {
        type: "number",
        description: "Protein in grams (optional)",
      },
      carbs: {
        type: "number",
        description: "Carbohydrates in grams (optional)",
      },
      fat: {
        type: "number",
        description: "Fat in grams (optional)",
      },
      fiber: {
        type: "number",
        description: "Fiber in grams (optional)",
      },
      mealType: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
        description: "Type of meal",
      },
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format (defaults to today)",
      },
      notes: {
        type: "string",
        description: "Optional notes about the meal",
      },
    },
    required: ["description", "calories", "mealType"],
  },
};

// Use a special FDC ID range for quick-add entries (negative numbers)
// This distinguishes them from real USDA foods
const QUICK_ADD_FDC_PREFIX = -1;

export async function handleQuickAdd(input: QuickAddInput, userId: string) {
  const {
    description,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    mealType,
    date,
    notes,
  } = quickAddSchema.parse(input);

  // Create nutrition object
  const nutrition: Nutrition = {
    calories,
    protein: protein || 0,
    carbs: carbs || 0,
    fat: fat || 0,
    fiber,
  };

  // Create a "custom" food entry
  // Use timestamp-based negative ID to make it unique
  const customFdcId = QUICK_ADD_FDC_PREFIX * Date.now();

  const foodEntry: MealFoodEntry = {
    fdcId: customFdcId,
    description: `[Quick Add] ${description}`,
    servings: 1,
    servingSize: 1,
    servingSizeUnit: "serving",
    nutrition,
  };

  // Create meal document
  const mealDate = date || new Date().toISOString().split("T")[0];
  const meal: Meal = {
    id: uuidv4(),
    userId,
    date: mealDate,
    mealType,
    foods: [foodEntry],
    totals: nutrition,
    notes,
    createdAt: new Date().toISOString(),
  };

  // Save to Cosmos DB
  await createMeal(meal);

  // Estimate macros if only calories provided
  let macroNote = null;
  if (!protein && !carbs && !fat) {
    macroNote = "Tip: Add protein, carbs, and fat for more accurate tracking.";
  }

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
            logged: {
              description,
              calories,
              protein: protein ? `${protein}g` : "not specified",
              carbs: carbs ? `${carbs}g` : "not specified",
              fat: fat ? `${fat}g` : "not specified",
              fiber: fiber ? `${fiber}g` : "not specified",
            },
            macroNote,
          },
          null,
          2
        ),
      },
    ],
  };
}
