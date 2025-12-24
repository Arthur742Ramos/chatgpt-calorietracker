import { z } from "zod";
import { setUserGoals, getUserGoals } from "../services/cosmos.js";
import { UserGoals } from "../models/user-goals.js";

export const setGoalsSchema = z.object({
  dailyCalories: z
    .number()
    .positive()
    .max(10000)
    .describe("Daily calorie goal"),
  protein: z
    .number()
    .positive()
    .max(500)
    .optional()
    .describe("Daily protein goal in grams"),
  carbs: z
    .number()
    .positive()
    .max(1000)
    .optional()
    .describe("Daily carbohydrate goal in grams"),
  fat: z
    .number()
    .positive()
    .max(500)
    .optional()
    .describe("Daily fat goal in grams"),
  fiber: z
    .number()
    .positive()
    .max(100)
    .optional()
    .describe("Daily fiber goal in grams"),
});

export type SetGoalsInput = z.infer<typeof setGoalsSchema>;

export const setGoalsTool = {
  name: "set_goals",
  description:
    "Set daily nutrition goals for calories and optionally macros (protein, carbs, fat, fiber).",
  inputSchema: {
    type: "object" as const,
    properties: {
      dailyCalories: {
        type: "number",
        description: "Daily calorie goal (required)",
      },
      protein: {
        type: "number",
        description: "Daily protein goal in grams (optional)",
      },
      carbs: {
        type: "number",
        description: "Daily carbohydrate goal in grams (optional)",
      },
      fat: {
        type: "number",
        description: "Daily fat goal in grams (optional)",
      },
      fiber: {
        type: "number",
        description: "Daily fiber goal in grams (optional)",
      },
    },
    required: ["dailyCalories"],
  },
};

export async function handleSetGoals(input: SetGoalsInput, userId: string) {
  const validatedInput = setGoalsSchema.parse(input);

  // Get existing goals to preserve any fields not being updated
  const existingGoals = await getUserGoals(userId);

  const now = new Date().toISOString();
  const goals: UserGoals = {
    id: userId,
    userId,
    dailyCalories: validatedInput.dailyCalories,
    protein: validatedInput.protein,
    carbs: validatedInput.carbs,
    fat: validatedInput.fat,
    fiber: validatedInput.fiber,
    createdAt: existingGoals?.createdAt || now,
    updatedAt: now,
  };

  await setUserGoals(goals);

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
      note:
        totalMacroCals !== goals.dailyCalories
          ? `Note: Macro calories (${totalMacroCals}) differ from calorie goal (${goals.dailyCalories})`
          : null,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: existingGoals ? "Goals updated" : "Goals created",
            goals: {
              dailyCalories: goals.dailyCalories,
              protein: goals.protein ? `${goals.protein}g` : "not set",
              carbs: goals.carbs ? `${goals.carbs}g` : "not set",
              fat: goals.fat ? `${goals.fat}g` : "not set",
              fiber: goals.fiber ? `${goals.fiber}g` : "not set",
            },
            macroBreakdown,
          },
          null,
          2
        ),
      },
    ],
  };
}
