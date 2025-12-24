import { z } from "zod";

// User's daily nutrition goals (stored in Cosmos DB)
export const UserGoalsSchema = z.object({
  id: z.string(), // Same as userId
  userId: z.string(), // ChatGPT user ID
  dailyCalories: z.number().positive(),
  protein: z.number().positive().optional(), // grams
  carbs: z.number().positive().optional(), // grams
  fat: z.number().positive().optional(), // grams
  fiber: z.number().positive().optional(), // grams
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type UserGoals = z.infer<typeof UserGoalsSchema>;

// Input for setting goals
export const SetGoalsInputSchema = z.object({
  dailyCalories: z.number().positive(),
  protein: z.number().positive().optional(),
  carbs: z.number().positive().optional(),
  fat: z.number().positive().optional(),
  fiber: z.number().positive().optional(),
});

export type SetGoalsInput = z.infer<typeof SetGoalsInputSchema>;

// Default goals if user hasn't set any
export const DEFAULT_GOALS: Omit<UserGoals, "id" | "userId" | "createdAt"> = {
  dailyCalories: 2000,
  protein: 50,
  carbs: 250,
  fat: 65,
  fiber: 25,
};
