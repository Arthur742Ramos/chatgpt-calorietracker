import { z } from "zod";
import { searchFoods } from "../services/usda.js";

export const searchFoodSchema = z.object({
  query: z.string().min(1).describe("Food name or description to search for"),
  limit: z
    .number()
    .min(1)
    .max(25)
    .default(10)
    .describe("Maximum number of results to return"),
});

export type SearchFoodInput = z.infer<typeof searchFoodSchema>;

export const searchFoodTool = {
  name: "search_food",
  description:
    "Search the USDA FoodData Central database for foods and their nutritional information. Use this to find foods before logging a meal.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Food name or description to search for",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (1-25, default 10)",
        default: 10,
      },
    },
    required: ["query"],
  },
};

export async function handleSearchFood(input: SearchFoodInput) {
  const { query, limit } = searchFoodSchema.parse(input);

  const foods = await searchFoods(query, limit);

  if (foods.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: `No foods found matching "${query}". Try a different search term.`,
        },
      ],
    };
  }

  const results = foods.map((food) => ({
    fdcId: food.fdcId,
    name: food.description,
    brand: food.brandName || null,
    servingSize: `${food.servingSize}${food.servingSizeUnit}`,
    nutrition: {
      calories: food.nutrition.calories,
      protein: `${food.nutrition.protein}g`,
      carbs: `${food.nutrition.carbs}g`,
      fat: `${food.nutrition.fat}g`,
    },
  }));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query,
            resultCount: foods.length,
            foods: results,
            hint: "Use the fdcId when logging a meal with log_meal",
          },
          null,
          2
        ),
      },
    ],
  };
}
