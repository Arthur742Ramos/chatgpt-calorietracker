import { z } from "zod";
import { getMealById, updateMeal } from "../services/cosmos.js";
import { getFoodsByIds } from "../services/usda.js";
import { MealTypeSchema } from "../models/index.js";
import {
  createMealFoodEntry,
  calculateTotalNutrition,
} from "../services/nutrition.js";

export const updateMealSchema = z.object({
  mealId: z.string().uuid().describe("ID of the meal to update"),
  addFoods: z
    .array(
      z.object({
        fdcId: z.number().describe("USDA FoodData Central ID"),
        servings: z.number().positive().default(1).describe("Number of servings"),
      })
    )
    .optional()
    .describe("Foods to add to the meal"),
  removeFoodIds: z
    .array(z.number())
    .optional()
    .describe("FDC IDs of foods to remove from the meal"),
  updateServings: z
    .array(
      z.object({
        fdcId: z.number().describe("FDC ID of food to update"),
        servings: z.number().positive().describe("New serving count"),
      })
    )
    .optional()
    .describe("Update servings for existing foods"),
  mealType: MealTypeSchema.optional().describe("Change the meal type"),
  notes: z.string().optional().describe("Update meal notes"),
});

export type UpdateMealInput = z.infer<typeof updateMealSchema>;

export const updateMealTool = {
  name: "update_meal",
  description:
    "Update an existing meal. Can add/remove foods, change servings, update meal type, or modify notes. Use get_meals first to find the meal ID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      mealId: {
        type: "string",
        description: "UUID of the meal to update (from get_meals)",
      },
      addFoods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fdcId: {
              type: "number",
              description: "USDA FoodData Central ID",
            },
            servings: {
              type: "number",
              description: "Number of servings (default: 1)",
              default: 1,
            },
          },
          required: ["fdcId"],
        },
        description: "Foods to add to the meal",
      },
      removeFoodIds: {
        type: "array",
        items: { type: "number" },
        description: "FDC IDs of foods to remove",
      },
      updateServings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fdcId: { type: "number", description: "FDC ID of food to update" },
            servings: { type: "number", description: "New serving count" },
          },
          required: ["fdcId", "servings"],
        },
        description: "Update servings for specific foods",
      },
      mealType: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "snack"],
        description: "Change meal type",
      },
      notes: {
        type: "string",
        description: "Update meal notes",
      },
    },
    required: ["mealId"],
  },
};

export async function handleUpdateMeal(input: UpdateMealInput, userId: string) {
  const {
    mealId,
    addFoods,
    removeFoodIds,
    updateServings,
    mealType,
    notes,
  } = updateMealSchema.parse(input);

  // Get existing meal
  const existingMeal = await getMealById(userId, mealId);

  if (!existingMeal) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: "Meal not found. Use get_meals to find valid meal IDs.",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  const changes: string[] = [];
  let updatedFoods = [...existingMeal.foods];

  // Remove foods
  if (removeFoodIds && removeFoodIds.length > 0) {
    const beforeCount = updatedFoods.length;
    updatedFoods = updatedFoods.filter(
      (f) => !removeFoodIds.includes(f.fdcId)
    );
    const removedCount = beforeCount - updatedFoods.length;
    if (removedCount > 0) {
      changes.push(`Removed ${removedCount} food(s)`);
    }
  }

  // Update servings
  if (updateServings && updateServings.length > 0) {
    for (const update of updateServings) {
      const foodIndex = updatedFoods.findIndex((f) => f.fdcId === update.fdcId);
      if (foodIndex !== -1) {
        const food = updatedFoods[foodIndex];
        // Scale nutrition based on new servings
        const ratio = update.servings / food.servings;
        updatedFoods[foodIndex] = {
          ...food,
          servings: update.servings,
          nutrition: {
            calories: Math.round(food.nutrition.calories * ratio),
            protein: Math.round(food.nutrition.protein * ratio * 10) / 10,
            carbs: Math.round(food.nutrition.carbs * ratio * 10) / 10,
            fat: Math.round(food.nutrition.fat * ratio * 10) / 10,
            fiber: food.nutrition.fiber
              ? Math.round(food.nutrition.fiber * ratio * 10) / 10
              : undefined,
            sugar: food.nutrition.sugar
              ? Math.round(food.nutrition.sugar * ratio * 10) / 10
              : undefined,
            sodium: food.nutrition.sodium
              ? Math.round(food.nutrition.sodium * ratio)
              : undefined,
          },
        };
        changes.push(`Updated ${food.description} to ${update.servings} serving(s)`);
      }
    }
  }

  // Add new foods
  if (addFoods && addFoods.length > 0) {
    const fdcIds = addFoods.map((f) => f.fdcId);
    const foodItems = await getFoodsByIds(fdcIds);

    for (const addInput of addFoods) {
      const foodItem = foodItems.find((f) => f.fdcId === addInput.fdcId);
      if (foodItem) {
        const entry = createMealFoodEntry(foodItem, addInput.servings);
        updatedFoods.push(entry);
        changes.push(`Added ${foodItem.description}`);
      }
    }
  }

  // Validate we still have foods
  if (updatedFoods.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: "Cannot remove all foods from a meal. Use delete_meal instead.",
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Update meal type
  const newMealType = mealType || existingMeal.mealType;
  if (mealType && mealType !== existingMeal.mealType) {
    changes.push(`Changed meal type from ${existingMeal.mealType} to ${mealType}`);
  }

  // Update notes
  const newNotes = notes !== undefined ? notes : existingMeal.notes;
  if (notes !== undefined && notes !== existingMeal.notes) {
    changes.push("Updated notes");
  }

  // Recalculate totals
  const newTotals = calculateTotalNutrition(updatedFoods);

  // Build updated meal
  const updatedMeal = {
    ...existingMeal,
    mealType: newMealType,
    foods: updatedFoods,
    totals: newTotals,
    notes: newNotes,
    updatedAt: new Date().toISOString(),
  };

  // Save to database
  await updateMeal(updatedMeal);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            mealId: updatedMeal.id,
            changes: changes.length > 0 ? changes : ["No changes made"],
            updatedMeal: {
              date: updatedMeal.date,
              mealType: updatedMeal.mealType,
              foods: updatedFoods.map((f) => ({
                fdcId: f.fdcId,
                name: f.description,
                servings: f.servings,
                calories: f.nutrition.calories,
              })),
              totals: {
                calories: newTotals.calories,
                protein: `${newTotals.protein}g`,
                carbs: `${newTotals.carbs}g`,
                fat: `${newTotals.fat}g`,
              },
              notes: newNotes || null,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
