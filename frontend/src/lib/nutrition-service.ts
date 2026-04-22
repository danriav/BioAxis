// frontend/src/lib/nutrition-service.ts

const PYTHON_API_URL = "http://localhost:8000";

export const NutritionService = {
  // Función para clonar el día
  async syncYesterdayPlan(userId: string, sourceDate: string, targetDate: string) {
    const response = await fetch(`${PYTHON_API_URL}/nutrition/sync-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        source_date: sourceDate,
        target_date: targetDate
      })
    });

    
    if (!response.ok) throw new Error("Error al sincronizar plan");
    return await response.json();
  },
    async searchFood(query: string) {
        const response = await fetch(`${PYTHON_API_URL}/nutrition/search?query=${query}`);
        if (!response.ok) throw new Error("Error al buscar alimento");
        return await response.json();
    },

    async addFoodLog(logData: any) {
        const response = await fetch(`${PYTHON_API_URL}/nutrition/add-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
        });
        return await response.json();
    }
};