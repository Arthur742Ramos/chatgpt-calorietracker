import { z } from "zod";
import { deleteMeal, getMealById } from "../services/cosmos.js";

export const deleteMealSchema = z.object({
  mealId: z.string().uuid().describe("The ID of the meal to delete"),
});

export type DeleteMealInput = z.infer<typeof deleteMealSchema>;

export const deleteMealTool = {
  name: "delete_meal",
  description:
    "Delete a previously logged meal by its ID. Use get_daily_summary to find meal IDs.",
  inputSchema: {
    type: "object" as const,
    properties: {
      mealId: {
        type: "string",
        description: "The UUID of the meal to delete",
      },
    },
    required: ["mealId"],
  },
};

export async function handleDeleteMeal(input: DeleteMealInput, userId: string) {
  const { mealId } = deleteMealSchema.parse(input);

  // First check if the meal exists and belongs to this user
  const meal = await getMealById(userId, mealId);

  if (!meal) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: "Meal not found or does not belong to you",
              mealId,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  // Delete the meal
  const deleted = await deleteMeal(userId, mealId);

  if (!deleted) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              success: false,
              error: "Failed to delete meal",
              mealId,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            message: "Meal deleted successfully",
            deletedMeal: {
              id: meal.id,
              date: meal.date,
              mealType: meal.mealType,
              calories: meal.totals.calories,
              foods: meal.foods.map((f) => f.description),
            },
          },
          null,
          2
        ),
      },
    ],
  };
}
