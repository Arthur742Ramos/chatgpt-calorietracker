import React from "react";

interface FoodResult {
  fdcId: number;
  name: string;
  brand?: string | null;
  servingSize: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
}

interface FoodSearchResultsProps {
  query: string;
  results: FoodResult[];
}

export const FoodSearchResults: React.FC<FoodSearchResultsProps> = ({
  query,
  results,
}) => {
  if (results.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "20px", color: "#6b7280" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>No results</div>
          <div>No foods found matching "{query}"</div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Search: "{query}"</h3>
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {results.map((food) => (
          <div
            key={food.fdcId}
            style={{
              padding: "12px",
              background: "#f9fafb",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div>
                <div style={{ fontWeight: "500", color: "#1a1a1a" }}>
                  {food.name}
                </div>
                {food.brand && (
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {food.brand}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontWeight: "600",
                  color: "#1a1a1a",
                  whiteSpace: "nowrap",
                }}
              >
                {food.nutrition.calories} cal
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              <span>per {food.servingSize}</span>
              <div style={{ display: "flex", gap: "12px" }}>
                <span>P: {food.nutrition.protein}</span>
                <span>C: {food.nutrition.carbs}</span>
                <span>F: {food.nutrition.fat}</span>
              </div>
            </div>

            <div
              style={{
                marginTop: "8px",
                fontSize: "11px",
                color: "#9ca3af",
              }}
            >
              ID: {food.fdcId}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoodSearchResults;
