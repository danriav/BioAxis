import {
  getConsumedMacroCards,
  getLocalDateString,
  getMealSections,
  getNutritionMacroCards,
  shiftDateString
} from "@/features/nutrition/NutritionScreen";

describe("nutrition targets view model", () => {
  it("formats successful nutrition macros for rendering", () => {
    expect(
      getNutritionMacroCards({
        carbs: 220,
        fat: 70,
        kcal: 2100,
        protein: 160
      })
    ).toEqual([
      { title: "Calorías objetivo", value: "2100 kcal" },
      { title: "Proteína", value: "160 g" },
      { title: "Carbohidratos", value: "220 g" },
      { title: "Grasas", value: "70 g" }
    ]);
  });

  it("formats consumed totals for rendering", () => {
    expect(
      getConsumedMacroCards({
        carbs: 88.4,
        fat: 12.2,
        kcal: 612.7,
        protein: 41.6
      })
    ).toEqual([
      { title: "Calorías consumidas", value: "613 kcal" },
      { title: "Proteína consumida", value: "42 g" },
      { title: "Carbohidratos consumidos", value: "88 g" },
      { title: "Grasas consumidas", value: "12 g" }
    ]);
  });

  it("formats empty consumed totals as zero", () => {
    expect(getConsumedMacroCards({ carbs: 0, fat: 0, kcal: 0, protein: 0 })).toEqual([
      { title: "Calorías consumidas", value: "0 kcal" },
      { title: "Proteína consumida", value: "0 g" },
      { title: "Carbohidratos consumidos", value: "0 g" },
      { title: "Grasas consumidas", value: "0 g" }
    ]);
  });

  it("groups meals from backend response and hides empty sections", () => {
    expect(
      getMealSections({
        date: "2026-06-12",
        items: [],
        meals: {
          comida: [
            {
              carbs: 66,
              consumed_at: "2026-06-12",
              fat: 7,
              food_id: "food-1",
              food_name: "Avena",
              id: "log-1",
              kcal: 389,
              meal_slot: "comida",
              protein: 17,
              quantity_g: 100
            }
          ],
          cena: [],
          desayuno: [],
          snacks: []
        },
        totals: { carbs: 66, fat: 7, kcal: 389, protein: 17 }
      })
    ).toEqual([
      {
        items: [
          {
            carbs: 66,
            consumed_at: "2026-06-12",
            fat: 7,
            food_id: "food-1",
            food_name: "Avena",
            id: "log-1",
            kcal: 389,
            meal_slot: "comida",
            protein: 17,
            quantity_g: 100
          }
        ],
        mealSlot: "comida"
      }
    ]);
  });

  it("keeps date state in YYYY-MM-DD", () => {
    expect(getLocalDateString(new Date("2026-06-12T12:00:00"))).toBe("2026-06-12");
    expect(shiftDateString("2026-06-12", -1)).toBe("2026-06-11");
    expect(shiftDateString("2026-06-12", 1)).toBe("2026-06-13");
  });
});
