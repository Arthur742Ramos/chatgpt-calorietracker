import React from "react";

interface DayData {
  date: string;
  calories: number;
  goalMet: boolean;
}

interface WeeklyChartProps {
  startDate: string;
  endDate: string;
  dailyData: DayData[];
  averageCalories: number;
  calorieGoal: number;
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  startDate,
  endDate,
  dailyData,
  averageCalories,
  calorieGoal,
}) => {
  const maxCalories = Math.max(
    calorieGoal * 1.2,
    ...dailyData.map((d) => d.calories)
  );

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Weekly Overview</h3>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {new Date(startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}{" "}
          -{" "}
          {new Date(endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Bar chart */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          height: "120px",
          padding: "0 8px",
          marginBottom: "8px",
          position: "relative",
        }}
      >
        {/* Goal line */}
        <div
          style={{
            position: "absolute",
            left: "0",
            right: "0",
            bottom: `${(calorieGoal / maxCalories) * 100}%`,
            borderTop: "2px dashed #9ca3af",
            zIndex: 1,
          }}
        />

        {dailyData.map((day, index) => {
          const height = (day.calories / maxCalories) * 100;
          const isToday =
            day.date === new Date().toISOString().split("T")[0];

          return (
            <div
              key={index}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: 1,
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: `${height}%`,
                  minHeight: day.calories > 0 ? "4px" : "0",
                  background: day.goalMet
                    ? "#10b981"
                    : day.calories > calorieGoal
                    ? "#f59e0b"
                    : day.calories > 0
                    ? "#3b82f6"
                    : "#e5e7eb",
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0 8px",
        }}
      >
        {dailyData.map((day, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: "11px",
              color:
                day.date === new Date().toISOString().split("T")[0]
                  ? "#1a1a1a"
                  : "#6b7280",
              fontWeight:
                day.date === new Date().toISOString().split("T")[0]
                  ? "600"
                  : "400",
            }}
          >
            {getDayLabel(day.date)}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #f3f4f6",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "600" }}>
            {averageCalories}
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>
            Avg. daily cal
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "600" }}>
            {calorieGoal}
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>Goal</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", fontWeight: "600" }}>
            {dailyData.filter((d) => d.goalMet).length}/7
          </div>
          <div style={{ fontSize: "11px", color: "#6b7280" }}>Days on track</div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyChart;
