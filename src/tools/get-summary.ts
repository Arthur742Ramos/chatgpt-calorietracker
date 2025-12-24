import { z } from "zod";
import { getMealsByDate, getUserGoals } from "../services/cosmos.js";
import { calculateDailySummary } from "../services/nutrition.js";
import { DEFAULT_GOALS } from "../models/user-goals.js";

export const getDailySummarySchema = z.object({
  date: z
    .string()
    .optional()
    .describe("Date in YYYY-MM-DD format (defaults to today)"),
});

export type GetDailySummaryInput = z.infer<typeof getDailySummarySchema>;

export const getDailySummaryTool = {
  name: "get_daily_summary",
  description:
    "Get a summary of calories and macros consumed for a specific day, including progress toward goals.",
  inputSchema: {
    type: "object" as const,
    properties: {
      date: {
        type: "string",
        description: "Date in YYYY-MM-DD format (defaults to today)",
      },
    },
    required: [],
  },
};

export async function handleGetDailySummary(
  input: GetDailySummaryInput,
  userId: string
) {
  const { date } = getDailySummarySchema.parse(input);
  const targetDate = date || new Date().toISOString().split("T")[0];

  // Get meals for the day
  const meals = await getMealsByDate(userId, targetDate);

  // Get user goals
  const userGoals = await getUserGoals(userId);
  const goals = userGoals || { ...DEFAULT_GOALS, id: userId, userId, createdAt: "" };

  // Calculate summary
  const summary = calculateDailySummary(meals, targetDate, goals);

  if (meals.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              date: targetDate,
              message: "No meals logged for this day",
              goals: {
                dailyCalories: goals.dailyCalories,
                protein: goals.protein,
                carbs: goals.carbs,
                fat: goals.fat,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            date: summary.date,
            mealsLogged: meals.length,
            totals: {
              calories: summary.totals.calories,
              protein: `${summary.totals.protein}g`,
              carbs: `${summary.totals.carbs}g`,
              fat: `${summary.totals.fat}g`,
              fiber: summary.totals.fiber ? `${summary.totals.fiber}g` : null,
            },
            byMealType: summary.meals.map((m) => ({
              type: m.mealType,
              calories: m.calories,
              mealsCount: m.count,
            })),
            goalProgress: summary.goalProgress
              ? {
                  calories: `${summary.goalProgress.calories.current}/${summary.goalProgress.calories.goal} (${summary.goalProgress.calories.percentage}%)`,
                  protein: summary.goalProgress.protein
                    ? `${summary.goalProgress.protein.current}g/${summary.goalProgress.protein.goal}g (${summary.goalProgress.protein.percentage}%)`
                    : null,
                  carbs: summary.goalProgress.carbs
                    ? `${summary.goalProgress.carbs.current}g/${summary.goalProgress.carbs.goal}g (${summary.goalProgress.carbs.percentage}%)`
                    : null,
                  fat: summary.goalProgress.fat
                    ? `${summary.goalProgress.fat.current}g/${summary.goalProgress.fat.goal}g (${summary.goalProgress.fat.percentage}%)`
                    : null,
                }
              : null,
            remaining: summary.goalProgress
              ? {
                  calories: Math.max(
                    0,
                    summary.goalProgress.calories.goal -
                      summary.goalProgress.calories.current
                  ),
                }
              : null,
          },
          null,
          2
        ),
      },
    ],
  };
}
