import { z } from "zod";
import { MealFoodEntrySchema, NutritionSchema } from "./food.js";

export const MealTypeSchema = z.enum([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
]);

export type MealType = z.infer<typeof MealTypeSchema>;

// Logged meal document (stored in Cosmos DB)
export const MealSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(), // ChatGPT user ID
  date: z.string(), // ISO date: YYYY-MM-DD
  mealType: MealTypeSchema,
  foods: z.array(MealFoodEntrySchema),
  totals: NutritionSchema,
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Meal = z.infer<typeof MealSchema>;

// Input for creating a new meal
export const CreateMealInputSchema = z.object({
  foods: z.array(
    z.object({
      fdcId: z.number(),
      servings: z.number().positive().default(1),
    })
  ),
  mealType: MealTypeSchema,
  notes: z.string().optional(),
  date: z.string().optional(), // Defaults to today
});

export type CreateMealInput = z.infer<typeof CreateMealInputSchema>;
