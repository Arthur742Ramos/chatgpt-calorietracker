import React from "react";

interface GoalProgress {
  current: number;
  goal: number;
  percentage: number;
}

interface DailySummaryProps {
  date: string;
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goalProgress?: {
    calories: GoalProgress;
    protein?: GoalProgress;
    carbs?: GoalProgress;
    fat?: GoalProgress;
  };
  mealCount: number;
}

function getProgressClass(percentage: number): string {
  if (percentage < 80) return "under";
  if (percentage <= 100) return "target";
  if (percentage <= 120) return "over";
  return "exceed";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().split("T")[0]) {
    return "Today";
  }
  if (dateStr === yesterday.toISOString().split("T")[0]) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const DailySummary: React.FC<DailySummaryProps> = ({
  date,
  totals,
  goalProgress,
  mealCount,
}) => {
  const caloriePercentage = goalProgress?.calories.percentage || 0;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{formatDate(date)}</h3>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {mealCount} meal{mealCount !== 1 ? "s" : ""} logged
        </span>
      </div>

      {/* Main calorie display */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <div style={{ fontSize: "36px", fontWeight: "700", color: "#1a1a1a" }}>
          {totals.calories}
        </div>
        <div style={{ fontSize: "13px", color: "#6b7280" }}>
          {goalProgress
            ? `of ${goalProgress.calories.goal} cal goal`
            : "calories"}
        </div>
        {goalProgress && (
          <div className="progress-bar" style={{ maxWidth: "200px", margin: "8px auto 0" }}>
            <div
              className={`progress-fill ${getProgressClass(caloriePercentage)}`}
              style={{ width: `${Math.min(caloriePercentage, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Macros grid */}
      <div className="nutrition-grid">
        <div className="nutrition-item">
          <div className="nutrition-value">{totals.protein}g</div>
          <div className="nutrition-label">Protein</div>
          {goalProgress?.protein && (
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressClass(goalProgress.protein.percentage)}`}
                style={{ width: `${Math.min(goalProgress.protein.percentage, 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">{totals.carbs}g</div>
          <div className="nutrition-label">Carbs</div>
          {goalProgress?.carbs && (
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressClass(goalProgress.carbs.percentage)}`}
                style={{ width: `${Math.min(goalProgress.carbs.percentage, 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">{totals.fat}g</div>
          <div className="nutrition-label">Fat</div>
          {goalProgress?.fat && (
            <div className="progress-bar">
              <div
                className={`progress-fill ${getProgressClass(goalProgress.fat.percentage)}`}
                style={{ width: `${Math.min(goalProgress.fat.percentage, 100)}%` }}
              />
            </div>
          )}
        </div>
        <div className="nutrition-item">
          <div className="nutrition-value">
            {goalProgress
              ? Math.max(0, goalProgress.calories.goal - totals.calories)
              : "-"}
          </div>
          <div className="nutrition-label">Remaining</div>
        </div>
      </div>
    </div>
  );
};

export default DailySummary;
