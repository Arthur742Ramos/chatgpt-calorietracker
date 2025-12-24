import React from "react";

interface MealFood {
  name: string;
  servings: number;
  calories: number;
}

interface MealCardProps {
  mealId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foods: MealFood[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  time?: string;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MealCard: React.FC<MealCardProps> = ({
  mealType,
  foods,
  totals,
  time,
}) => {
  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className={`badge badge-${mealType}`}>
            {mealTypeLabels[mealType]}
          </span>
          {time && (
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>{time}</span>
          )}
        </div>
        <span style={{ fontWeight: "600", fontSize: "16px" }}>
          {totals.calories} cal
        </span>
      </div>

      <ul className="food-list">
        {foods.map((food, index) => (
          <li key={index} className="food-item">
            <span className="food-name">
              {food.name}
              {food.servings !== 1 && (
                <span style={{ color: "#9ca3af" }}> x{food.servings}</span>
              )}
            </span>
            <span className="food-calories">{food.calories} cal</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #f3f4f6",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        <span>P: {totals.protein}g</span>
        <span>C: {totals.carbs}g</span>
        <span>F: {totals.fat}g</span>
      </div>
    </div>
  );
};

export default MealCard;
