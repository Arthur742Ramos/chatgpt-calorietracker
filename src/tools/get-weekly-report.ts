import { z } from "zod";
import { getMealsByDateRange, getUserGoals } from "../services/cosmos.js";
import { calculateWeeklyReport } from "../services/nutrition.js";
import { DEFAULT_GOALS } from "../models/user-goals.js";

export const getWeeklyReportSchema = z.object({
  weeksAgo: z
    .number()
    .min(0)
    .max(12)
    .default(0)
    .describe("Number of weeks ago (0 = current week)"),
});

export type GetWeeklyReportInput = z.infer<typeof getWeeklyReportSchema>;

export const getWeeklyReportTool = {
  name: "get_weekly_report",
  description:
    "Get a 7-day report showing daily calorie/macro trends and averages.",
  inputSchema: {
    type: "object" as const,
    properties: {
      weeksAgo: {
        type: "number",
        description: "Number of weeks ago (0 = current week, max 12)",
        default: 0,
      },
    },
    required: [],
  },
};

export async function handleGetWeeklyReport(
  input: GetWeeklyReportInput,
  userId: string
) {
  const { weeksAgo } = getWeeklyReportSchema.parse(input);

  // Calculate date range
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() - weeksAgo * 7);

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 6);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  // Get meals for the week
  const meals = await getMealsByDateRange(userId, startStr, endStr);

  // Get user goals
  const userGoals = await getUserGoals(userId);
  const goals = userGoals || { ...DEFAULT_GOALS, id: userId, userId, createdAt: "" };

  // Calculate report
  const report = calculateWeeklyReport(meals, startStr, endStr, goals);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            period: {
              start: report.startDate,
              end: report.endDate,
            },
            totalMealsLogged: report.totalMeals,
            dailyAverages: {
              calories: report.averages.calories,
              protein: `${report.averages.protein}g`,
              carbs: `${report.averages.carbs}g`,
              fat: `${report.averages.fat}g`,
            },
            goals: {
              dailyCalories: goals.dailyCalories,
              protein: goals.protein ? `${goals.protein}g` : null,
              carbs: goals.carbs ? `${goals.carbs}g` : null,
              fat: goals.fat ? `${goals.fat}g` : null,
            },
            dailyBreakdown: report.dailySummaries.map((day) => ({
              date: day.date,
              calories: day.totals.calories,
              protein: day.totals.protein,
              carbs: day.totals.carbs,
              fat: day.totals.fat,
              mealsLogged: day.meals.reduce((sum, m) => sum + m.count, 0),
              goalMet:
                day.goalProgress &&
                day.goalProgress.calories.percentage >= 90 &&
                day.goalProgress.calories.percentage <= 110,
            })),
            insights: generateInsights(report, goals),
          },
          null,
          2
        ),
      },
    ],
  };
}

function generateInsights(
  report: ReturnType<typeof calculateWeeklyReport>,
  goals: { dailyCalories: number; protein?: number }
): string[] {
  const insights: string[] = [];

  // Days tracked
  const daysWithMeals = report.dailySummaries.filter(
    (d) => d.meals.length > 0
  ).length;
  if (daysWithMeals < 7) {
    insights.push(
      `You logged meals on ${daysWithMeals} of 7 days. Try to log every day for better tracking.`
    );
  }

  // Calorie average vs goal
  const avgCalories = report.averages.calories;
  const caloriePercentage = Math.round((avgCalories / goals.dailyCalories) * 100);

  if (caloriePercentage < 80) {
    insights.push(
      `Your average intake (${avgCalories} cal) is ${100 - caloriePercentage}% below your goal.`
    );
  } else if (caloriePercentage > 120) {
    insights.push(
      `Your average intake (${avgCalories} cal) is ${caloriePercentage - 100}% above your goal.`
    );
  } else {
    insights.push(
      `Great job! Your average intake is within 20% of your ${goals.dailyCalories} cal goal.`
    );
  }

  // Consistency check
  const calorieValues = report.dailySummaries
    .filter((d) => d.meals.length > 0)
    .map((d) => d.totals.calories);

  if (calorieValues.length >= 3) {
    const max = Math.max(...calorieValues);
    const min = Math.min(...calorieValues);
    const variance = max - min;

    if (variance > 1000) {
      insights.push(
        `Your daily calories varied by ${variance} cal this week. More consistency may help reach your goals.`
      );
    }
  }

  return insights;
}
