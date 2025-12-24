import { z } from "zod";
import { getMealsByDate, getMealsByDateRange } from "../services/cosmos.js";

export const getMealsSchema = z.object({
  date: z
    .string()
    .optional()
    .describe("Date in YYYY-MM-DD format (defaults to today)"),
  startDate: z
    .string()
    .optional()
    .describe("Start date for range query (YYYY-MM-DD)"),
  endDate: z
    .string()
    .optional()
    .describe("End date for range query (YYYY-MM-DD)"),
});

export type GetMealsInput = z.infer<typeof getMealsSchema>;

export const getMealsTool = {
  name: "get_meals",
  description:
    "Get logged meals for a specific date or date range. Returns full meal details including individual foods and nutrition.",
  inputSchema: {
    type: "object" as const,
    properties: {
      date: {
        type: "string",
        description:
          "Date in YYYY-MM-DD format. If not provided, defaults to today.",
      },
      startDate: {
        type: "string",
        description:
          "Start date for range query (YYYY-MM-DD). Use with endDate for multi-day queries.",
      },
      endDate: {
        type: "string",
        description:
          "End date for range query (YYYY-MM-DD). Use with startDate for multi-day queries.",
      },
    },
    required: [],
  },
};

export async function handleGetMeals(input: GetMealsInput, userId: string) {
  const { date, startDate, endDate } = getMealsSchema.parse(input);

  let meals;

  // If date range is specified, use range query
  if (startDate && endDate) {
    meals = await getMealsByDateRange(userId, startDate, endDate);
  } else {
    // Single date query (default to today)
    const queryDate = date || new Date().toISOString().split("T")[0];
    meals = await getMealsByDate(userId, queryDate);
  }

  if (meals.length === 0) {
    const dateInfo = startDate && endDate
      ? `between ${startDate} and ${endDate}`
      : `on ${date || "today"}`;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              meals: [],
              message: `No meals logged ${dateInfo}.`,
              hint: "Use log_meal or quick_add to log a meal.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Format meals for output
  const formattedMeals = meals.map((meal) => ({
    mealId: meal.id,
    date: meal.date,
    mealType: meal.mealType,
    foods: meal.foods.map((f) => ({
      fdcId: f.fdcId,
      name: f.description,
      servings: f.servings,
      servingSize: `${f.servingSize}${f.servingSizeUnit}`,
      calories: f.nutrition.calories,
      protein: `${f.nutrition.protein}g`,
      carbs: `${f.nutrition.carbs}g`,
      fat: `${f.nutrition.fat}g`,
    })),
    totals: {
      calories: meal.totals.calories,
      protein: `${meal.totals.protein}g`,
      carbs: `${meal.totals.carbs}g`,
      fat: `${meal.totals.fat}g`,
    },
    notes: meal.notes || null,
    loggedAt: meal.createdAt,
  }));

  // Calculate summary totals
  const totalCalories = meals.reduce((sum, m) => sum + m.totals.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.totals.protein, 0);
  const totalCarbs = meals.reduce((sum, m) => sum + m.totals.carbs, 0);
  const totalFat = meals.reduce((sum, m) => sum + m.totals.fat, 0);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            mealCount: meals.length,
            meals: formattedMeals,
            dayTotals: {
              calories: totalCalories,
              protein: `${Math.round(totalProtein * 10) / 10}g`,
              carbs: `${Math.round(totalCarbs * 10) / 10}g`,
              fat: `${Math.round(totalFat * 10) / 10}g`,
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
