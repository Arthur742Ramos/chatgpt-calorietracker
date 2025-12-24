import { Nutrition, Meal, MealFoodEntry, FoodItem } from "../models/index.js";

/**
 * Calculate total nutrition from multiple food entries
 */
export function calculateTotalNutrition(foods: MealFoodEntry[]): Nutrition {
  const totals: Nutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  };

  for (const food of foods) {
    totals.calories += food.nutrition.calories;
    totals.protein += food.nutrition.protein;
    totals.carbs += food.nutrition.carbs;
    totals.fat += food.nutrition.fat;
    totals.fiber = (totals.fiber || 0) + (food.nutrition.fiber || 0);
    totals.sugar = (totals.sugar || 0) + (food.nutrition.sugar || 0);
    totals.sodium = (totals.sodium || 0) + (food.nutrition.sodium || 0);
  }

  // Round values
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round((totals.fiber || 0) * 10) / 10,
    sugar: Math.round((totals.sugar || 0) * 10) / 10,
    sodium: Math.round(totals.sodium || 0),
  };
}

/**
 * Scale nutrition values based on serving count
 */
export function scaleNutrition(
  nutrition: Nutrition,
  servings: number
): Nutrition {
  return {
    calories: Math.round(nutrition.calories * servings),
    protein: Math.round(nutrition.protein * servings * 10) / 10,
    carbs: Math.round(nutrition.carbs * servings * 10) / 10,
    fat: Math.round(nutrition.fat * servings * 10) / 10,
    fiber: nutrition.fiber
      ? Math.round(nutrition.fiber * servings * 10) / 10
      : undefined,
    sugar: nutrition.sugar
      ? Math.round(nutrition.sugar * servings * 10) / 10
      : undefined,
    sodium: nutrition.sodium ? Math.round(nutrition.sodium * servings) : undefined,
  };
}

/**
 * Create a meal food entry from a food item and servings
 */
export function createMealFoodEntry(
  food: FoodItem,
  servings: number
): MealFoodEntry {
  return {
    fdcId: food.fdcId,
    description: food.description,
    servings,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    nutrition: scaleNutrition(food.nutrition, servings),
  };
}

/**
 * Aggregate nutrition totals from multiple meals
 */
export function aggregateMealsNutrition(meals: Meal[]): Nutrition {
  const allFoods = meals.flatMap((meal) => meal.foods);
  return calculateTotalNutrition(allFoods);
}

/**
 * Calculate daily summary from meals
 */
export interface DailySummary {
  date: string;
  totals: Nutrition;
  meals: {
    mealType: string;
    calories: number;
    count: number;
  }[];
  goalProgress?: {
    calories: { current: number; goal: number; percentage: number };
    protein?: { current: number; goal: number; percentage: number };
    carbs?: { current: number; goal: number; percentage: number };
    fat?: { current: number; goal: number; percentage: number };
  };
}

export function calculateDailySummary(
  meals: Meal[],
  date: string,
  goals?: { dailyCalories: number; protein?: number; carbs?: number; fat?: number }
): DailySummary {
  const totals = aggregateMealsNutrition(meals);

  // Group by meal type
  const mealsByType = new Map<string, Meal[]>();
  for (const meal of meals) {
    const existing = mealsByType.get(meal.mealType) || [];
    existing.push(meal);
    mealsByType.set(meal.mealType, existing);
  }

  const mealSummaries = Array.from(mealsByType.entries()).map(
    ([mealType, typeMeals]) => ({
      mealType,
      calories: typeMeals.reduce((sum, m) => sum + m.totals.calories, 0),
      count: typeMeals.length,
    })
  );

  const summary: DailySummary = {
    date,
    totals,
    meals: mealSummaries,
  };

  // Add goal progress if goals exist
  if (goals) {
    summary.goalProgress = {
      calories: {
        current: totals.calories,
        goal: goals.dailyCalories,
        percentage: Math.round((totals.calories / goals.dailyCalories) * 100),
      },
    };

    if (goals.protein) {
      summary.goalProgress.protein = {
        current: totals.protein,
        goal: goals.protein,
        percentage: Math.round((totals.protein / goals.protein) * 100),
      };
    }

    if (goals.carbs) {
      summary.goalProgress.carbs = {
        current: totals.carbs,
        goal: goals.carbs,
        percentage: Math.round((totals.carbs / goals.carbs) * 100),
      };
    }

    if (goals.fat) {
      summary.goalProgress.fat = {
        current: totals.fat,
        goal: goals.fat,
        percentage: Math.round((totals.fat / goals.fat) * 100),
      };
    }
  }

  return summary;
}

/**
 * Calculate weekly report
 */
export interface WeeklyReport {
  startDate: string;
  endDate: string;
  dailySummaries: DailySummary[];
  averages: Nutrition;
  totalMeals: number;
}

export function calculateWeeklyReport(
  meals: Meal[],
  startDate: string,
  endDate: string,
  goals?: { dailyCalories: number; protein?: number; carbs?: number; fat?: number }
): WeeklyReport {
  // Group meals by date
  const mealsByDate = new Map<string, Meal[]>();
  for (const meal of meals) {
    const existing = mealsByDate.get(meal.date) || [];
    existing.push(meal);
    mealsByDate.set(meal.date, existing);
  }

  // Generate summaries for each day
  const dailySummaries: DailySummary[] = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayMeals = mealsByDate.get(dateStr) || [];
    dailySummaries.push(calculateDailySummary(dayMeals, dateStr, goals));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Calculate averages
  const daysWithMeals = dailySummaries.filter((d) => d.meals.length > 0).length;
  const totalNutrition = aggregateMealsNutrition(meals);

  const averages: Nutrition =
    daysWithMeals > 0
      ? {
          calories: Math.round(totalNutrition.calories / daysWithMeals),
          protein: Math.round((totalNutrition.protein / daysWithMeals) * 10) / 10,
          carbs: Math.round((totalNutrition.carbs / daysWithMeals) * 10) / 10,
          fat: Math.round((totalNutrition.fat / daysWithMeals) * 10) / 10,
          fiber: totalNutrition.fiber
            ? Math.round((totalNutrition.fiber / daysWithMeals) * 10) / 10
            : undefined,
          sugar: totalNutrition.sugar
            ? Math.round((totalNutrition.sugar / daysWithMeals) * 10) / 10
            : undefined,
          sodium: totalNutrition.sodium
            ? Math.round(totalNutrition.sodium / daysWithMeals)
            : undefined,
        }
      : {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };

  return {
    startDate,
    endDate,
    dailySummaries,
    averages,
    totalMeals: meals.length,
  };
}
