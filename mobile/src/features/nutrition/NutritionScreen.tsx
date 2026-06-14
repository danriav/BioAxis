import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { MockCard } from "@/components/MockCard";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  getFoodDisplayName,
  getFoodMacroSummary,
  mealSlotOptions,
  saveFoodLogAndReload,
  statusFromAddFoodError,
  validateAddFoodForm,
  type MealSlotOption
} from "@/features/nutrition/addFoodViewModel";
import {
  createEditFoodLogInput,
  deleteFoodLogAndReload,
  statusFromFoodLogMutationError,
  updateFoodLogAndReload,
  type EditFoodLogInput
} from "@/features/nutrition/editFoodLogViewModel";
import { useNutritionLogs } from "@/features/nutrition/useNutritionLogs";
import { useNutritionTargets } from "@/features/nutrition/useNutritionTargets";
import { searchNutritionFoods, type FoodSearchItem } from "@/lib/api/nutrition-foods";
import type { NutritionDayLogs, NutritionDayTotals } from "@/lib/api/nutrition-logs";
import { colors, spacing } from "@/styles/theme";

export function getNutritionMacroCards(targets: {
  carbs: number;
  fat: number;
  kcal: number;
  protein: number;
}) {
  return [
    { title: "Calorías objetivo", value: `${targets.kcal} kcal` },
    { title: "Proteína", value: `${targets.protein} g` },
    { title: "Carbohidratos", value: `${targets.carbs} g` },
    { title: "Grasas", value: `${targets.fat} g` }
  ];
}

export function getConsumedMacroCards(totals: NutritionDayTotals) {
  return [
    { title: "Calorías consumidas", value: `${Math.round(totals.kcal)} kcal` },
    { title: "Proteína consumida", value: `${Math.round(totals.protein)} g` },
    { title: "Carbohidratos consumidos", value: `${Math.round(totals.carbs)} g` },
    { title: "Grasas consumidas", value: `${Math.round(totals.fat)} g` }
  ];
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDateString(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

export function getMealSections(logs: NutritionDayLogs) {
  if (!logs.meals) {
    return [];
  }

  return Object.entries(logs.meals)
    .map(([mealSlot, items]) => ({ items, mealSlot }))
    .filter((section) => section.items.length > 0);
}

export function NutritionScreen() {
  const { session } = useAuth();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null);
  const [mealSlot, setMealSlot] = useState<MealSlotOption["value"]>("desayuno");
  const [quantityText, setQuantityText] = useState("100");
  const [searchState, setSearchState] = useState<AddFoodUiState>({
    message: "Escribe el nombre de un alimento.",
    status: "idle"
  });
  const [saveState, setSaveState] = useState<AddFoodUiState>({
    message: null,
    status: "idle"
  });
  const [editInput, setEditInput] = useState<EditFoodLogInput | null>(null);
  const [mutationState, setMutationState] = useState<AddFoodUiState>({
    message: null,
    status: "idle"
  });
  const targetsState = useNutritionTargets();
  const logsState = useNutritionLogs(selectedDate);

  async function runSearch() {
    const query = searchQuery.trim();
    setSelectedFood(null);
    setSaveState({ message: null, status: "idle" });

    if (!query) {
      setSearchResults([]);
      setSearchState({ message: "Escribe el nombre de un alimento.", status: "empty" });
      return;
    }

    setSearchState({ message: null, status: "loading" });

    try {
      const results = await searchNutritionFoods(session, query);
      setSearchResults(results);
      setSearchState({
        message: results.length === 0 ? "No encontramos alimentos para esa busqueda." : null,
        status: results.length === 0 ? "empty" : "success"
      });
    } catch (error) {
      setSearchResults([]);
      const mapped = statusFromAddFoodError(error);
      setSearchState({ message: mapped.message, status: mapped.status });
    }
  }

  async function saveEditedFoodLog() {
    if (!editInput) {
      return;
    }

    setMutationState({ message: null, status: "saving" });

    try {
      await updateFoodLogAndReload(session, editInput, logsState.reload);
      setMutationState({ message: "Cambios guardados.", status: "success" });
      setEditInput(null);
    } catch (error) {
      const mapped = statusFromFoodLogMutationError(error);
      setMutationState({ message: mapped.message, status: mapped.status });
    }
  }

  function confirmDeleteFoodLog(logId: string) {
    Alert.alert("Borrar alimento", "Esta acción quitará el alimento del registro diario.", [
      { style: "cancel", text: "Cancelar" },
      {
        onPress: () => {
          void deleteSelectedFoodLog(logId);
        },
        style: "destructive",
        text: "Borrar"
      }
    ]);
  }

  async function deleteSelectedFoodLog(logId: string) {
    setMutationState({ message: null, status: "deleting" });

    try {
      await deleteFoodLogAndReload(session, logId, logsState.reload);
      setMutationState({ message: "Alimento borrado.", status: "success" });
      setEditInput((current) => (current?.logId === logId ? null : current));
    } catch (error) {
      const mapped = statusFromFoodLogMutationError(error);
      setMutationState({ message: mapped.message, status: mapped.status });
    }
  }

  async function saveSelectedFood() {
    const input = { food: selectedFood, mealSlot, quantityText, targetDate: selectedDate };
    const validation = validateAddFoodForm(input);
    if (validation.status === "invalid") {
      setSaveState({ message: validation.message, status: "validation_error" });
      return;
    }

    setSaveState({ message: null, status: "saving" });

    try {
      await saveFoodLogAndReload(session, input, logsState.reload);
      setSaveState({ message: "Alimento registrado.", status: "success" });
      setSelectedFood(null);
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      const mapped = statusFromAddFoodError(error);
      setSaveState({ message: mapped.message, status: mapped.status });
    }
  }

  return (
    <Screen
      eyebrow="Nutrición"
      title="Registro diario"
      description="Consumo real del día y objetivos nutricionales cargados desde FastAPI."
    >
      <MockCard title="Fecha" value={selectedDate}>
        <View style={styles.dateRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setSelectedDate((current) => shiftDateString(current, -1))}
          >
            <Text style={styles.secondaryButtonText}>Día anterior</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => setSelectedDate(getLocalDateString())}>
            <Text style={styles.secondaryButtonText}>Hoy</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setSelectedDate((current) => shiftDateString(current, 1))}
          >
            <Text style={styles.secondaryButtonText}>Día siguiente</Text>
          </Pressable>
        </View>
      </MockCard>

      <Pressable style={styles.button} onPress={() => setIsAddFoodOpen((current) => !current)}>
        <Text style={styles.buttonText}>{isAddFoodOpen ? "Cerrar agregar alimento" : "Agregar alimento"}</Text>
      </Pressable>

      {isAddFoodOpen ? (
        <MockCard title="Agregar alimento">
          <View style={styles.formStack}>
            <TextInput
              autoCapitalize="none"
              onChangeText={setSearchQuery}
              onSubmitEditing={() => {
                void runSearch();
              }}
              placeholder="Buscar alimento"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.input}
              value={searchQuery}
            />
            <Pressable
              disabled={searchState.status === "loading"}
              style={[styles.button, searchState.status === "loading" ? styles.disabledButton : null]}
              onPress={() => {
                void runSearch();
              }}
            >
              <Text style={styles.buttonText}>{searchState.status === "loading" ? "Buscando" : "Buscar"}</Text>
            </Pressable>

            {searchState.message ? (
              <Text style={searchState.status === "success" ? styles.successText : styles.helpText}>
                {searchState.message}
              </Text>
            ) : null}

            {searchResults.length > 0 ? (
              <View style={styles.resultList}>
                {searchResults.map((food, index) => (
                  <Pressable
                    key={food.id ?? `${getFoodDisplayName(food)}-${index}`}
                    disabled={!food.id}
                    style={[
                      styles.resultRow,
                      selectedFood?.id === food.id ? styles.selectedResultRow : null,
                      !food.id ? styles.disabledButton : null
                    ]}
                    onPress={() => setSelectedFood(food)}
                  >
                    <Text style={styles.foodName}>{getFoodDisplayName(food)}</Text>
                    <Text style={styles.foodMeta}>{getFoodMacroSummary(food)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.slotRow}>
              {mealSlotOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.slotButton, mealSlot === option.value ? styles.selectedSlotButton : null]}
                  onPress={() => setMealSlot(option.value)}
                >
                  <Text style={mealSlot === option.value ? styles.selectedSlotText : styles.secondaryButtonText}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              keyboardType="decimal-pad"
              onChangeText={setQuantityText}
              placeholder="Gramos"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={quantityText}
            />

            {saveState.message ? (
              <Text style={saveState.status === "success" ? styles.successText : styles.errorText}>
                {saveState.message}
              </Text>
            ) : null}

            <Pressable
              disabled={saveState.status === "saving"}
              style={[styles.button, saveState.status === "saving" ? styles.disabledButton : null]}
              onPress={() => {
                void saveSelectedFood();
              }}
            >
              <Text style={styles.buttonText}>{saveState.status === "saving" ? "Guardando" : "Guardar alimento"}</Text>
            </Pressable>
          </View>
        </MockCard>
      ) : null}

      {logsState.status === "loading" ? <MockCard title="Consumo" value="Cargando" /> : null}

      {mutationState.message ? (
        <Text style={mutationState.status === "success" ? styles.successText : styles.errorText}>
          {mutationState.message}
        </Text>
      ) : null}

      {logsState.status === "success" && logsState.logs ? (
        <>
          {getConsumedMacroCards(logsState.logs.totals).map((card) => (
            <MockCard key={card.title} title={card.title} value={card.value} />
          ))}

          {logsState.logs.items.length === 0 ? (
            <MockCard title="Aun no hay alimentos registrados">
              Registra tu primera comida para ver el detalle del día.
            </MockCard>
          ) : (
            getMealSections(logsState.logs).map((section) => (
              <MockCard key={section.mealSlot} title={section.mealSlot}>
                <View style={styles.mealList}>
                  {section.items.map((item) => (
                    <View key={item.id} style={styles.foodItem}>
                      <View style={styles.foodRow}>
                        <View style={styles.foodNameColumn}>
                          <Text style={styles.foodName}>{item.food_name ?? "Alimento"}</Text>
                          <Text style={styles.foodMeta}>{Math.round(item.quantity_g)} g</Text>
                        </View>
                        <Text style={styles.foodKcal}>{Math.round(item.kcal)} kcal</Text>
                      </View>

                      {editInput?.logId === item.id ? (
                        <View style={styles.formStack}>
                          <View style={styles.slotRow}>
                            {mealSlotOptions.map((option) => (
                              <Pressable
                                key={option.value}
                                style={[
                                  styles.slotButton,
                                  editInput.mealSlot === option.value ? styles.selectedSlotButton : null
                                ]}
                                onPress={() =>
                                  setEditInput((current) =>
                                    current ? { ...current, mealSlot: option.value } : current
                                  )
                                }
                              >
                                <Text
                                  style={
                                    editInput.mealSlot === option.value
                                      ? styles.selectedSlotText
                                      : styles.secondaryButtonText
                                  }
                                >
                                  {option.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>

                          <TextInput
                            keyboardType="decimal-pad"
                            onChangeText={(text) =>
                              setEditInput((current) => (current ? { ...current, quantityText: text } : current))
                            }
                            placeholder="Gramos"
                            placeholderTextColor={colors.muted}
                            style={styles.input}
                            value={editInput.quantityText}
                          />

                          <View style={styles.actionRow}>
                            <Pressable
                              disabled={mutationState.status === "saving"}
                              style={[
                                styles.secondaryButton,
                                mutationState.status === "saving" ? styles.disabledButton : null
                              ]}
                              onPress={() => {
                                void saveEditedFoodLog();
                              }}
                            >
                              <Text style={styles.secondaryButtonText}>
                                {mutationState.status === "saving" ? "Guardando" : "Guardar cambios"}
                              </Text>
                            </Pressable>
                            <Pressable style={styles.secondaryButton} onPress={() => setEditInput(null)}>
                              <Text style={styles.secondaryButtonText}>Cancelar</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.actionRow}>
                          <Pressable
                            style={styles.secondaryButton}
                            onPress={() => {
                              setMutationState({ message: null, status: "idle" });
                              setEditInput(createEditFoodLogInput(item, selectedDate));
                            }}
                          >
                            <Text style={styles.secondaryButtonText}>Editar</Text>
                          </Pressable>
                          <Pressable
                            disabled={mutationState.status === "deleting"}
                            style={[
                              styles.secondaryButton,
                              mutationState.status === "deleting" ? styles.disabledButton : null
                            ]}
                            onPress={() => confirmDeleteFoodLog(item.id)}
                          >
                            <Text style={styles.secondaryButtonText}>
                              {mutationState.status === "deleting" ? "Borrando" : "Borrar"}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </MockCard>
            ))
          )}
        </>
      ) : null}

      {logsState.status !== "loading" && logsState.status !== "success" ? (
        <MockCard title={statusLabel[logsState.status]}>
          {logsState.errorMessage ?? "No pudimos cargar tus alimentos del día."}
        </MockCard>
      ) : null}

      {targetsState.status === "loading" ? <MockCard title="Objetivos" value="Cargando" /> : null}

      {targetsState.status === "success" && targetsState.targets ? (
        <>
          {getNutritionMacroCards(targetsState.targets).map((card) => (
            <MockCard key={card.title} title={card.title} value={card.value} />
          ))}
        </>
      ) : null}

      {targetsState.status !== "loading" && targetsState.status !== "success" ? (
        <MockCard title={statusLabel[targetsState.status]}>
          {targetsState.errorMessage ?? "No pudimos cargar tus objetivos nutricionales."}
        </MockCard>
      ) : null}

      <Pressable
        style={styles.button}
        onPress={() => {
          void logsState.reload();
          void targetsState.reload();
        }}
      >
        <Text style={styles.buttonText}>Actualizar nutricion</Text>
      </Pressable>
    </Screen>
  );
}

const statusLabel = {
  error: "Error",
  forbidden: "Permiso denegado",
  missing_session: "Sesión no disponible",
  network_error: "Error de red",
  not_found: "No encontrado",
  session_expired: "Sesión expirada",
  unexpected_error: "Error",
  validation_error: "Solicitud rechazada"
} as const;

type AddFoodUiState = {
  message: string | null;
  status:
    | "empty"
    | "error"
    | "forbidden"
    | "idle"
    | "deleting"
    | "loading"
    | "missing_session"
    | "network_error"
    | "not_found"
    | "saving"
    | "session_expired"
    | "success"
    | "unexpected_error"
    | "validation_error";
};

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  button: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md
  },
  buttonText: {
    color: colors.text,
    fontWeight: "800"
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  disabledButton: {
    opacity: 0.55
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700"
  },
  foodKcal: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800"
  },
  foodMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.xs
  },
  foodName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800"
  },
  foodNameColumn: {
    flex: 1
  },
  foodItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.sm
  },
  foodRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm
  },
  formStack: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  helpText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18
  },
  input: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  mealList: {
    marginTop: spacing.sm
  },
  resultList: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden"
  },
  resultRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md
  },
  secondaryButton: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800"
  },
  selectedResultRow: {
    backgroundColor: colors.primarySoft
  },
  selectedSlotButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  selectedSlotText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "900"
  },
  slotButton: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800"
  }
});
