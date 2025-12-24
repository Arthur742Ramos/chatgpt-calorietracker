import {
  searchFoodTool,
  searchFoodSchema,
  handleSearchFood,
} from "./search-food.js";

import { logMealTool, logMealSchema, handleLogMeal } from "./log-meal.js";

import {
  getDailySummaryTool,
  getDailySummarySchema,
  handleGetDailySummary,
} from "./get-summary.js";

import {
  getWeeklyReportTool,
  getWeeklyReportSchema,
  handleGetWeeklyReport,
} from "./get-weekly-report.js";

import { setGoalsTool, setGoalsSchema, handleSetGoals } from "./set-goals.js";

import {
  deleteMealTool,
  deleteMealSchema,
  handleDeleteMeal,
} from "./delete-meal.js";

import {
  getGoalsTool,
  getGoalsSchema,
  handleGetGoals,
} from "./get-goals.js";

import {
  getMealsTool,
  getMealsSchema,
  handleGetMeals,
} from "./get-meals.js";

import {
  updateMealTool,
  updateMealSchema,
  handleUpdateMeal,
} from "./update-meal.js";

import {
  quickAddTool,
  quickAddSchema,
  handleQuickAdd,
} from "./quick-add.js";

// Re-export everything
export {
  searchFoodTool,
  searchFoodSchema,
  handleSearchFood,
  logMealTool,
  logMealSchema,
  handleLogMeal,
  getDailySummaryTool,
  getDailySummarySchema,
  handleGetDailySummary,
  getWeeklyReportTool,
  getWeeklyReportSchema,
  handleGetWeeklyReport,
  setGoalsTool,
  setGoalsSchema,
  handleSetGoals,
  deleteMealTool,
  deleteMealSchema,
  handleDeleteMeal,
  getGoalsTool,
  getGoalsSchema,
  handleGetGoals,
  getMealsTool,
  getMealsSchema,
  handleGetMeals,
  updateMealTool,
  updateMealSchema,
  handleUpdateMeal,
  quickAddTool,
  quickAddSchema,
  handleQuickAdd,
};

// All tools for registration
export const ALL_TOOLS = [
  { definition: searchFoodTool, handler: handleSearchFood, requiresUserId: false },
  { definition: logMealTool, handler: handleLogMeal, requiresUserId: true },
  { definition: getDailySummaryTool, handler: handleGetDailySummary, requiresUserId: true },
  { definition: getWeeklyReportTool, handler: handleGetWeeklyReport, requiresUserId: true },
  { definition: setGoalsTool, handler: handleSetGoals, requiresUserId: true },
  { definition: deleteMealTool, handler: handleDeleteMeal, requiresUserId: true },
  { definition: getGoalsTool, handler: handleGetGoals, requiresUserId: true },
  { definition: getMealsTool, handler: handleGetMeals, requiresUserId: true },
  { definition: updateMealTool, handler: handleUpdateMeal, requiresUserId: true },
  { definition: quickAddTool, handler: handleQuickAdd, requiresUserId: true },
];
