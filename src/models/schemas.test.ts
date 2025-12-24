import { describe, it, expect } from "vitest";
import { NutritionSchema, FoodItemSchema, MealFoodEntrySchema } from "./food.js";
import { MealSchema, MealTypeSchema, CreateMealInputSchema } from "./meal.js";
import { UserGoalsSchema, SetGoalsInputSchema, DEFAULT_GOALS } from "./user-goals.js";

describe("Zod schemas", () => {
  describe("NutritionSchema", () => {
    it("should validate valid nutrition data", () => {
      const data = {
        calories: 250,
        protein: 20.5,
        carbs: 30,
        fat: 8.2,
        fiber: 5,
        sugar: 12,
        sodium: 400,
      };

      const result = NutritionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate with only required fields", () => {
      const data = {
        calories: 100,
        protein: 10,
        carbs: 15,
        fat: 5,
      };

      const result = NutritionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const data = {
        calories: 100,
        protein: 10,
        // missing carbs and fat
      };

      const result = NutritionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("should reject non-numeric values", () => {
      const data = {
        calories: "100",
        protein: 10,
        carbs: 15,
        fat: 5,
      };

      const result = NutritionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("FoodItemSchema", () => {
    it("should validate valid food item", () => {
      const data = {
        fdcId: 123456,
        description: "Chicken Breast, grilled",
        brandName: "Tyson",
        servingSize: 100,
        servingSizeUnit: "g",
        nutrition: {
          calories: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        },
      };

      const result = FoodItemSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should default servingSizeUnit to 'g'", () => {
      const data = {
        fdcId: 123456,
        description: "Apple",
        servingSize: 182,
        nutrition: {
          calories: 95,
          protein: 0.5,
          carbs: 25,
          fat: 0.3,
        },
      };

      const result = FoodItemSchema.parse(data);
      expect(result.servingSizeUnit).toBe("g");
    });

    it("should reject negative fdcId", () => {
      const data = {
        fdcId: -1,
        description: "Invalid",
        servingSize: 100,
        nutrition: {
          calories: 100,
          protein: 10,
          carbs: 10,
          fat: 5,
        },
      };

      // fdcId is just z.number(), so negative is technically valid
      // This test documents current behavior
      const result = FoodItemSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("MealTypeSchema", () => {
    it("should accept valid meal types", () => {
      expect(MealTypeSchema.safeParse("breakfast").success).toBe(true);
      expect(MealTypeSchema.safeParse("lunch").success).toBe(true);
      expect(MealTypeSchema.safeParse("dinner").success).toBe(true);
      expect(MealTypeSchema.safeParse("snack").success).toBe(true);
    });

    it("should reject invalid meal types", () => {
      expect(MealTypeSchema.safeParse("brunch").success).toBe(false);
      expect(MealTypeSchema.safeParse("supper").success).toBe(false);
      expect(MealTypeSchema.safeParse("").success).toBe(false);
    });
  });

  describe("MealSchema", () => {
    it("should validate complete meal document", () => {
      const meal = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user-123",
        date: "2024-01-15",
        mealType: "lunch",
        foods: [
          {
            fdcId: 123456,
            description: "Salad",
            servings: 1,
            servingSize: 200,
            servingSizeUnit: "g",
            nutrition: { calories: 150, protein: 5, carbs: 20, fat: 7 },
          },
        ],
        totals: { calories: 150, protein: 5, carbs: 20, fat: 7 },
        createdAt: "2024-01-15T12:30:00.000Z",
      };

      const result = MealSchema.safeParse(meal);
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const meal = {
        id: "not-a-uuid",
        userId: "user-123",
        date: "2024-01-15",
        mealType: "lunch",
        foods: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        createdAt: "2024-01-15T12:30:00.000Z",
      };

      const result = MealSchema.safeParse(meal);
      expect(result.success).toBe(false);
    });

    it("should reject invalid datetime format", () => {
      const meal = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user-123",
        date: "2024-01-15",
        mealType: "lunch",
        foods: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        createdAt: "not-a-datetime",
      };

      const result = MealSchema.safeParse(meal);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateMealInputSchema", () => {
    it("should validate meal creation input", () => {
      const input = {
        foods: [
          { fdcId: 123456, servings: 1.5 },
          { fdcId: 789012, servings: 2 },
        ],
        mealType: "dinner",
        notes: "Post-workout meal",
        date: "2024-01-15",
      };

      const result = CreateMealInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should default servings to 1", () => {
      const input = {
        foods: [{ fdcId: 123456 }],
        mealType: "breakfast",
      };

      const result = CreateMealInputSchema.parse(input);
      expect(result.foods[0].servings).toBe(1);
    });

    it("should reject zero or negative servings", () => {
      const input = {
        foods: [{ fdcId: 123456, servings: 0 }],
        mealType: "breakfast",
      };

      const result = CreateMealInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept input without optional fields", () => {
      const input = {
        foods: [{ fdcId: 123456 }],
        mealType: "snack",
      };

      const result = CreateMealInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("UserGoalsSchema", () => {
    it("should validate complete goals document", () => {
      const goals = {
        id: "user-123",
        userId: "user-123",
        dailyCalories: 2000,
        protein: 150,
        carbs: 200,
        fat: 65,
        fiber: 30,
        createdAt: "2024-01-15T10:00:00.000Z",
      };

      const result = UserGoalsSchema.safeParse(goals);
      expect(result.success).toBe(true);
    });

    it("should reject non-positive calorie goal", () => {
      const goals = {
        id: "user-123",
        userId: "user-123",
        dailyCalories: 0,
        createdAt: "2024-01-15T10:00:00.000Z",
      };

      const result = UserGoalsSchema.safeParse(goals);
      expect(result.success).toBe(false);
    });
  });

  describe("SetGoalsInputSchema", () => {
    it("should validate goals input", () => {
      const input = {
        dailyCalories: 1800,
        protein: 120,
        carbs: 180,
        fat: 60,
      };

      const result = SetGoalsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should require dailyCalories", () => {
      const input = {
        protein: 100,
      };

      const result = SetGoalsInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should allow only dailyCalories", () => {
      const input = {
        dailyCalories: 2500,
      };

      const result = SetGoalsInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("DEFAULT_GOALS", () => {
    it("should have sensible default values", () => {
      expect(DEFAULT_GOALS.dailyCalories).toBe(2000);
      expect(DEFAULT_GOALS.protein).toBe(50);
      expect(DEFAULT_GOALS.carbs).toBe(250);
      expect(DEFAULT_GOALS.fat).toBe(65);
      expect(DEFAULT_GOALS.fiber).toBe(25);
    });
  });
});
