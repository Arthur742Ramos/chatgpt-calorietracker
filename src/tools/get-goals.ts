import { z } from "zod";
import { getUserGoals } from "../services/cosmos.js";
import { DEFAULT_GOALS } from "../models/user-goals.js";

export const getGoalsSchema = z.object({});

export type GetGoalsInput = z.infer<typeof getGoalsSchema>;

export const getGoalsTool = {
  name: "get_goals",
  description:
    "Get the user's current daily nutrition goals. Returns default goals if none have been set.",
  inputSchema: {
    type: "object" as const,
    properties: {},
    required: [],
  },
};

export async function handleGetGoals(_input: GetGoalsInput, userId: string) {
  const goals = await getUserGoals(userId);

  if (!goals) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              isDefault: true,
              message: "No custom goals set. Using default goals.",
              goals: {
                dailyCalories: DEFAULT_GOALS.dailyCalories,
                protein: `${DEFAULT_GOALS.protein}g`,
                carbs: `${DEFAULT_GOALS.carbs}g`,
                fat: `${DEFAULT_GOALS.fat}g`,
                fiber: `${DEFAULT_GOALS.fiber}g`,
              },
              hint: "Use set_goals to customize your nutrition targets.",
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // Calculate macro percentages if all macros are set
  let macroBreakdown = null;
  if (goals.protein && goals.carbs && goals.fat) {
    const proteinCals = goals.protein * 4;
    const carbsCals = goals.carbs * 4;
    const fatCals = goals.fat * 9;
    const totalMacroCals = proteinCals + carbsCals + fatCals;

    macroBreakdown = {
      protein: `${Math.round((proteinCals / totalMacroCals) * 100)}%`,
      carbs: `${Math.round((carbsCals / totalMacroCals) * 100)}%`,
      fat: `${Math.round((fatCals / totalMacroCals) * 100)}%`,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            isDefault: false,
            goals: {
              dailyCalories: goals.dailyCalories,
              protein: goals.protein ? `${goals.protein}g` : "not set",
              carbs: goals.carbs ? `${goals.carbs}g` : "not set",
              fat: goals.fat ? `${goals.fat}g` : "not set",
              fiber: goals.fiber ? `${goals.fiber}g` : "not set",
            },
            macroBreakdown,
            lastUpdated: goals.updatedAt || goals.createdAt,
          },
          null,
          2
        ),
      },
    ],
  };
}
