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
};

// All tools for registration
export const ALL_TOOLS = [
  { definition: searchFoodTool, handler: handleSearchFood, requiresUserId: false },
  { definition: logMealTool, handler: handleLogMeal, requiresUserId: true },
  { definition: getDailySummaryTool, handler: handleGetDailySummary, requiresUserId: true },
  { definition: getWeeklyReportTool, handler: handleGetWeeklyReport, requiresUserId: true },
  { definition: setGoalsTool, handler: handleSetGoals, requiresUserId: true },
  { definition: deleteMealTool, handler: handleDeleteMeal, requiresUserId: true },
];
