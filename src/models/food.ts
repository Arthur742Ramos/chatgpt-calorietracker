import { z } from "zod";

// Nutrition info schema
export const NutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(), // grams
  carbs: z.number(), // grams
  fat: z.number(), // grams
  fiber: z.number().optional(), // grams
  sugar: z.number().optional(), // grams
  sodium: z.number().optional(), // mg
});

export type Nutrition = z.infer<typeof NutritionSchema>;

// Food item from USDA database
export const FoodItemSchema = z.object({
  fdcId: z.number(), // USDA FoodData Central ID
  description: z.string(),
  brandName: z.string().optional(),
  servingSize: z.number(), // grams
  servingSizeUnit: z.string().default("g"),
  nutrition: NutritionSchema,
});

export type FoodItem = z.infer<typeof FoodItemSchema>;

// Food entry in a logged meal
export const MealFoodEntrySchema = z.object({
  fdcId: z.number(),
  description: z.string(),
  servings: z.number().positive(),
  servingSize: z.number(),
  servingSizeUnit: z.string(),
  nutrition: NutritionSchema, // Nutrition for the actual amount consumed
});

export type MealFoodEntry = z.infer<typeof MealFoodEntrySchema>;
