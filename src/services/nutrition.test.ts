import { describe, it, expect } from "vitest";
import {
  calculateTotalNutrition,
  scaleNutrition,
  createMealFoodEntry,
  aggregateMealsNutrition,
  calculateDailySummary,
  calculateWeeklyReport,
} from "./nutrition.js";
import type { MealFoodEntry, Meal, FoodItem, Nutrition } from "../models/index.js";

describe("nutrition service", () => {
  describe("calculateTotalNutrition", () => {
    it("should calculate totals from multiple food entries", () => {
      const foods: MealFoodEntry[] = [
        {
          fdcId: 1,
          description: "Apple",
          servings: 1,
          servingSize: 182,
          servingSizeUnit: "g",
          nutrition: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4 },
        },
        {
          fdcId: 2,
          description: "Banana",
          servings: 1,
          servingSize: 118,
          servingSizeUnit: "g",
          nutrition: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1 },
        },
      ];

      const result = calculateTotalNutrition(foods);

      expect(result.calories).toBe(200);
      expect(result.protein).toBe(1.8);
      expect(result.carbs).toBe(52);
      expect(result.fat).toBe(0.7);
      expect(result.fiber).toBe(7.5);
    });

    it("should return zeros for empty array", () => {
      const result = calculateTotalNutrition([]);

      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
      expect(result.carbs).toBe(0);
      expect(result.fat).toBe(0);
    });

    it("should handle optional nutrition fields", () => {
      const foods: MealFoodEntry[] = [
        {
          fdcId: 1,
          description: "Food without optionals",
          servings: 1,
          servingSize: 100,
          servingSizeUnit: "g",
          nutrition: { calories: 100, protein: 10, carbs: 20, fat: 5 },
        },
      ];

      const result = calculateTotalNutrition(foods);

      expect(result.calories).toBe(100);
      expect(result.fiber).toBe(0);
      expect(result.sugar).toBe(0);
      expect(result.sodium).toBe(0);
    });
  });

  describe("scaleNutrition", () => {
    const baseNutrition: Nutrition = {
      calories: 100,
      protein: 10,
      carbs: 20,
      fat: 5,
      fiber: 3,
      sugar: 8,
      sodium: 150,
    };

    it("should scale nutrition by servings", () => {
      const result = scaleNutrition(baseNutrition, 2);

      expect(result.calories).toBe(200);
      expect(result.protein).toBe(20);
      expect(result.carbs).toBe(40);
      expect(result.fat).toBe(10);
      expect(result.fiber).toBe(6);
      expect(result.sugar).toBe(16);
      expect(result.sodium).toBe(300);
    });

    it("should handle fractional servings", () => {
      const result = scaleNutrition(baseNutrition, 0.5);

      expect(result.calories).toBe(50);
      expect(result.protein).toBe(5);
      expect(result.carbs).toBe(10);
      expect(result.fat).toBe(2.5);
    });

    it("should handle undefined optional fields", () => {
      const nutrition: Nutrition = {
        calories: 100,
        protein: 10,
        carbs: 20,
        fat: 5,
      };

      const result = scaleNutrition(nutrition, 2);

      expect(result.fiber).toBeUndefined();
      expect(result.sugar).toBeUndefined();
      expect(result.sodium).toBeUndefined();
    });
  });

  describe("createMealFoodEntry", () => {
    const foodItem: FoodItem = {
      fdcId: 12345,
      description: "Chicken Breast",
      servingSize: 100,
      servingSizeUnit: "g",
      nutrition: {
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0,
      },
    };

    it("should create meal entry with scaled nutrition", () => {
      const entry = createMealFoodEntry(foodItem, 2);

      expect(entry.fdcId).toBe(12345);
      expect(entry.description).toBe("Chicken Breast");
      expect(entry.servings).toBe(2);
      expect(entry.nutrition.calories).toBe(330);
      expect(entry.nutrition.protein).toBe(62);
    });

    it("should preserve serving size info", () => {
      const entry = createMealFoodEntry(foodItem, 1.5);

      expect(entry.servingSize).toBe(100);
      expect(entry.servingSizeUnit).toBe("g");
    });
  });

  describe("aggregateMealsNutrition", () => {
    it("should aggregate nutrition from multiple meals", () => {
      const meals: Meal[] = [
        {
          id: "meal-1",
          userId: "user-1",
          date: "2024-01-15",
          mealType: "breakfast",
          foods: [
            {
              fdcId: 1,
              description: "Eggs",
              servings: 2,
              servingSize: 50,
              servingSizeUnit: "g",
              nutrition: { calories: 156, protein: 12, carbs: 1, fat: 11 },
            },
          ],
          totals: { calories: 156, protein: 12, carbs: 1, fat: 11 },
          createdAt: "2024-01-15T08:00:00Z",
        },
        {
          id: "meal-2",
          userId: "user-1",
          date: "2024-01-15",
          mealType: "lunch",
          foods: [
            {
              fdcId: 2,
              description: "Salad",
              servings: 1,
              servingSize: 200,
              servingSizeUnit: "g",
              nutrition: { calories: 150, protein: 5, carbs: 20, fat: 7 },
            },
          ],
          totals: { calories: 150, protein: 5, carbs: 20, fat: 7 },
          createdAt: "2024-01-15T12:00:00Z",
        },
      ];

      const result = aggregateMealsNutrition(meals);

      expect(result.calories).toBe(306);
      expect(result.protein).toBe(17);
      expect(result.carbs).toBe(21);
      expect(result.fat).toBe(18);
    });
  });

  describe("calculateDailySummary", () => {
    const testMeals: Meal[] = [
      {
        id: "meal-1",
        userId: "user-1",
        date: "2024-01-15",
        mealType: "breakfast",
        foods: [
          {
            fdcId: 1,
            description: "Oatmeal",
            servings: 1,
            servingSize: 40,
            servingSizeUnit: "g",
            nutrition: { calories: 150, protein: 5, carbs: 27, fat: 3 },
          },
        ],
        totals: { calories: 150, protein: 5, carbs: 27, fat: 3 },
        createdAt: "2024-01-15T08:00:00Z",
      },
      {
        id: "meal-2",
        userId: "user-1",
        date: "2024-01-15",
        mealType: "lunch",
        foods: [
          {
            fdcId: 2,
            description: "Sandwich",
            servings: 1,
            servingSize: 200,
            servingSizeUnit: "g",
            nutrition: { calories: 450, protein: 25, carbs: 45, fat: 18 },
          },
        ],
        totals: { calories: 450, protein: 25, carbs: 45, fat: 18 },
        createdAt: "2024-01-15T12:00:00Z",
      },
    ];

    it("should calculate daily totals", () => {
      const summary = calculateDailySummary(testMeals, "2024-01-15");

      expect(summary.date).toBe("2024-01-15");
      expect(summary.totals.calories).toBe(600);
      expect(summary.totals.protein).toBe(30);
    });

    it("should group meals by type", () => {
      const summary = calculateDailySummary(testMeals, "2024-01-15");

      expect(summary.meals).toHaveLength(2);
      const breakfast = summary.meals.find((m) => m.mealType === "breakfast");
      expect(breakfast?.calories).toBe(150);
      expect(breakfast?.count).toBe(1);
    });

    it("should calculate goal progress when goals provided", () => {
      const goals = { dailyCalories: 2000, protein: 100, carbs: 250, fat: 65 };
      const summary = calculateDailySummary(testMeals, "2024-01-15", goals);

      expect(summary.goalProgress).toBeDefined();
      expect(summary.goalProgress?.calories.current).toBe(600);
      expect(summary.goalProgress?.calories.goal).toBe(2000);
      expect(summary.goalProgress?.calories.percentage).toBe(30);
    });

    it("should not include goal progress when no goals", () => {
      const summary = calculateDailySummary(testMeals, "2024-01-15");

      expect(summary.goalProgress).toBeUndefined();
    });
  });

  describe("calculateWeeklyReport", () => {
    const weekMeals: Meal[] = [
      {
        id: "meal-1",
        userId: "user-1",
        date: "2024-01-15",
        mealType: "breakfast",
        foods: [
          {
            fdcId: 1,
            description: "Food",
            servings: 1,
            servingSize: 100,
            servingSizeUnit: "g",
            nutrition: { calories: 500, protein: 20, carbs: 60, fat: 15 },
          },
        ],
        totals: { calories: 500, protein: 20, carbs: 60, fat: 15 },
        createdAt: "2024-01-15T08:00:00Z",
      },
      {
        id: "meal-2",
        userId: "user-1",
        date: "2024-01-16",
        mealType: "lunch",
        foods: [
          {
            fdcId: 2,
            description: "Food",
            servings: 1,
            servingSize: 100,
            servingSizeUnit: "g",
            nutrition: { calories: 700, protein: 30, carbs: 80, fat: 20 },
          },
        ],
        totals: { calories: 700, protein: 30, carbs: 80, fat: 20 },
        createdAt: "2024-01-16T12:00:00Z",
      },
    ];

    it("should generate daily summaries for date range", () => {
      const report = calculateWeeklyReport(weekMeals, "2024-01-15", "2024-01-17");

      expect(report.startDate).toBe("2024-01-15");
      expect(report.endDate).toBe("2024-01-17");
      expect(report.dailySummaries).toHaveLength(3);
    });

    it("should calculate averages across days with meals", () => {
      const report = calculateWeeklyReport(weekMeals, "2024-01-15", "2024-01-17");

      // 2 days with meals, total 1200 calories
      expect(report.averages.calories).toBe(600);
      expect(report.averages.protein).toBe(25);
    });

    it("should count total meals", () => {
      const report = calculateWeeklyReport(weekMeals, "2024-01-15", "2024-01-17");

      expect(report.totalMeals).toBe(2);
    });

    it("should handle empty meal list", () => {
      const report = calculateWeeklyReport([], "2024-01-15", "2024-01-17");

      expect(report.averages.calories).toBe(0);
      expect(report.totalMeals).toBe(0);
    });
  });
});
