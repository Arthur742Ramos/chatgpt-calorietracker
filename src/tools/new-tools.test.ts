import { describe, it, expect } from "vitest";
import { getGoalsSchema } from "./get-goals.js";
import { getMealsSchema } from "./get-meals.js";
import { updateMealSchema } from "./update-meal.js";
import { quickAddSchema } from "./quick-add.js";

describe("new tools schemas", () => {
  describe("getGoalsSchema", () => {
    it("should accept empty object", () => {
      const result = getGoalsSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("getMealsSchema", () => {
    it("should accept empty object (defaults to today)", () => {
      const result = getMealsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept specific date", () => {
      const result = getMealsSchema.safeParse({ date: "2024-01-15" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe("2024-01-15");
      }
    });

    it("should accept date range", () => {
      const result = getMealsSchema.safeParse({
        startDate: "2024-01-01",
        endDate: "2024-01-07",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.startDate).toBe("2024-01-01");
        expect(result.data.endDate).toBe("2024-01-07");
      }
    });
  });

  describe("updateMealSchema", () => {
    it("should require mealId", () => {
      const result = updateMealSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept valid mealId", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = updateMealSchema.safeParse({
        mealId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should accept addFoods", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        addFoods: [{ fdcId: 123456, servings: 2 }],
      });
      expect(result.success).toBe(true);
    });

    it("should accept removeFoodIds", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        removeFoodIds: [123456, 789012],
      });
      expect(result.success).toBe(true);
    });

    it("should accept updateServings", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        updateServings: [{ fdcId: 123456, servings: 3 }],
      });
      expect(result.success).toBe(true);
    });

    it("should accept mealType change", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        mealType: "dinner",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid mealType", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        mealType: "brunch",
      });
      expect(result.success).toBe(false);
    });

    it("should accept notes update", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        notes: "Updated notes",
      });
      expect(result.success).toBe(true);
    });

    it("should accept multiple updates at once", () => {
      const result = updateMealSchema.safeParse({
        mealId: "550e8400-e29b-41d4-a716-446655440000",
        addFoods: [{ fdcId: 123 }],
        removeFoodIds: [456],
        updateServings: [{ fdcId: 789, servings: 2 }],
        mealType: "lunch",
        notes: "Big lunch",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("quickAddSchema", () => {
    it("should require description, calories, and mealType", () => {
      const result = quickAddSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should accept minimal valid input", () => {
      const result = quickAddSchema.safeParse({
        description: "Restaurant burger",
        calories: 800,
        mealType: "lunch",
      });
      expect(result.success).toBe(true);
    });

    it("should accept full input with all macros", () => {
      const result = quickAddSchema.safeParse({
        description: "Homemade pasta",
        calories: 650,
        protein: 25,
        carbs: 80,
        fat: 20,
        fiber: 5,
        mealType: "dinner",
        date: "2024-01-15",
        notes: "Made with whole wheat pasta",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty description", () => {
      const result = quickAddSchema.safeParse({
        description: "",
        calories: 500,
        mealType: "snack",
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative calories", () => {
      const result = quickAddSchema.safeParse({
        description: "Something",
        calories: -100,
        mealType: "snack",
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero calories", () => {
      const result = quickAddSchema.safeParse({
        description: "Water",
        calories: 0,
        mealType: "snack",
      });
      expect(result.success).toBe(false);
    });

    it("should reject calories over 10000", () => {
      const result = quickAddSchema.safeParse({
        description: "Huge meal",
        calories: 15000,
        mealType: "dinner",
      });
      expect(result.success).toBe(false);
    });

    it("should accept macros set to 0", () => {
      const result = quickAddSchema.safeParse({
        description: "Sugar water",
        calories: 100,
        protein: 0,
        carbs: 25,
        fat: 0,
        mealType: "snack",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid mealType", () => {
      const result = quickAddSchema.safeParse({
        description: "Something",
        calories: 300,
        mealType: "supper",
      });
      expect(result.success).toBe(false);
    });
  });
});
