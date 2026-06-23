import { useEffect, useState } from "react";
import { useNavigation } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Utensils,
  X
} from "lucide-react-native";

import { CircularProgress } from "@/components/CircularProgress";
import { MacroProgressBar } from "@/components/MacroProgressBar";
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
import type {
  NutritionDayLogs,
  NutritionDayTotals,
  NutritionLogFoodItem
} from "@/lib/api/nutrition-logs";
import type { NutritionTargets } from "@/lib/api/nutrition-targets";
import { colors, radii, shadows, spacing, tabBarStyle, typography } from "@/styles/theme";

export function getNutritionMacroCards(targets: NutritionTargets) {
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

export function getCaloriesSummary(totals: NutritionDayTotals, targets: NutritionTargets) {
  const consumed = Math.round(totals.kcal);
  const target = Math.round(targets.kcal);
  const progressRatio = target > 0 ? Math.min(consumed / target, 1) : 0;

  return {
    label: `${consumed} / ${target} kcal`,
    progressPercent: `${Math.round(progressRatio * 100)}%` as `${number}%`,
    progressRatio
  };
}

export function getMacroProgressCards(totals: NutritionDayTotals, targets: NutritionTargets) {
  return [
    { title: "Proteína", value: `${Math.round(totals.protein)} / ${Math.round(targets.protein)} g` },
    { title: "Carbohidratos", value: `${Math.round(totals.carbs)} / ${Math.round(targets.carbs)} g` },
    { title: "Grasas", value: `${Math.round(totals.fat)} / ${Math.round(targets.fat)} g` }
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
  return mealSlotOptions.map((option) => ({
    items: logs.meals?.[option.value] ?? [],
    mealSlot: option.value,
    title: option.label
  }));
}

function getDisplayDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  const today = getLocalDateString();

  if (dateString === today) {
    return "Hoy";
  }

  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short"
  });
}

export function NutritionScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString);
  const [isAddFoodOpen, setIsAddFoodOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchItem | null>(null);
  const [mealSlot, setMealSlot] = useState<MealSlotOption["value"]>("desayuno");
  const [quantityText, setQuantityText] = useState("100");
  const [searchState, setSearchState] = useState<FoodUiState>({
    message: "Escribe el nombre de un alimento.",
    status: "idle"
  });
  const [saveState, setSaveState] = useState<FoodUiState>({ message: null, status: "idle" });
  const [editInput, setEditInput] = useState<EditFoodLogInput | null>(null);
  const [mutationState, setMutationState] = useState<FoodUiState>({
    message: null,
    status: "idle"
  });
  const targetsState = useNutritionTargets();
  const logsState = useNutritionLogs(selectedDate);
  const readyTargets = targetsState.status === "success" ? targetsState.targets : null;
  const readyLogs = logsState.status === "success" ? logsState.logs : null;
  const caloriesSummary = readyLogs && readyTargets ? getCaloriesSummary(readyLogs.totals, readyTargets) : null;
  const isLoading = logsState.status === "loading" || targetsState.status === "loading";
  const isCompactScreen = width < 380;
  const isFoodModalOpen = isAddFoodOpen || editInput !== null;

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isFoodModalOpen ? { display: "none" } : tabBarStyle
    });

    return () => {
      navigation.setOptions({ tabBarStyle });
    };
  }, [isFoodModalOpen, navigation]);

  function openAddFood(meal: MealSlotOption["value"] = "desayuno") {
    setMealSlot(meal);
    setSelectedFood(null);
    setSearchResults([]);
    setSearchQuery("");
    setQuantityText("100");
    setSearchState({ message: "Busca y selecciona un alimento.", status: "idle" });
    setSaveState({ message: null, status: "idle" });
    setIsAddFoodOpen(true);
  }

  function closeFoodModal() {
    if (saveState.status === "saving" || mutationState.status === "saving") {
      return;
    }
    setIsAddFoodOpen(false);
    setEditInput(null);
  }

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
        message: results.length === 0 ? "No encontramos alimentos para esa búsqueda." : null,
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
      setMutationState({ message: "Alimento registrado.", status: "success" });
      setSaveState({ message: null, status: "idle" });
      setIsAddFoodOpen(false);
    } catch (error) {
      const mapped = statusFromAddFoodError(error);
      setSaveState({ message: mapped.message, status: mapped.status });
    }
  }

  function beginEdit(item: NutritionLogFoodItem) {
    setMutationState({ message: null, status: "idle" });
    setEditInput(createEditFoodLogInput(item, selectedDate));
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        testID="nutrition-scroll"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Hoy en Kalos</Text>
            <Text style={styles.pageTitle}>Nutrición</Text>
          </View>
          <Pressable
            accessibilityLabel="Actualizar nutrición"
            accessibilityRole="button"
            style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            onPress={() => {
              void logsState.reload();
              void targetsState.reload();
            }}
          >
            <RefreshCw color={colors.textSubtle} size={20} />
          </Pressable>
        </View>

        <View style={styles.dateSelector}>
          <Pressable
            accessibilityLabel="Día anterior"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.dateArrow}
            onPress={() => setSelectedDate((current) => shiftDateString(current, -1))}
          >
            <ChevronLeft color={colors.text} size={22} />
          </Pressable>
          <Pressable
            accessibilityLabel="Volver a hoy"
            accessibilityRole="button"
            style={styles.dateValue}
            onPress={() => setSelectedDate(getLocalDateString())}
          >
            <CalendarDays color={colors.primary} size={17} />
            <View>
              <Text style={styles.dateTitle}>{getDisplayDate(selectedDate)}</Text>
              <Text style={styles.dateText}>{selectedDate}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityLabel="Día siguiente"
            accessibilityRole="button"
            hitSlop={8}
            style={styles.dateArrow}
            onPress={() => setSelectedDate((current) => shiftDateString(current, 1))}
          >
            <ChevronRight color={colors.text} size={22} />
          </Pressable>
        </View>

        {isLoading ? (
          <View accessibilityLabel="Cargando nutrición" style={styles.loadingPanel}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Preparando tu resumen del día</Text>
          </View>
        ) : null}

        {!isLoading && readyLogs && readyTargets && caloriesSummary ? (
          <View style={[styles.summary, isCompactScreen ? styles.compactSummary : null]}>
            <CircularProgress
              consumed={Math.round(readyLogs.totals.kcal)}
              progress={caloriesSummary.progressRatio}
              target={Math.round(readyTargets.kcal)}
            />
            <View style={[styles.macroStack, isCompactScreen ? styles.compactMacroStack : null]}>
              <MacroProgressBar
                color={colors.protein}
                consumed={Math.round(readyLogs.totals.protein)}
                label="Proteína"
                target={Math.round(readyTargets.protein)}
              />
              <MacroProgressBar
                color={colors.carbs}
                consumed={Math.round(readyLogs.totals.carbs)}
                label="Carbohidratos"
                target={Math.round(readyTargets.carbs)}
              />
              <MacroProgressBar
                color={colors.fat}
                consumed={Math.round(readyLogs.totals.fat)}
                label="Grasas"
                target={Math.round(readyTargets.fat)}
              />
            </View>
          </View>
        ) : null}

        {mutationState.message ? (
          <View
            style={[
              styles.feedback,
              mutationState.status === "success" ? styles.successFeedback : styles.errorFeedback
            ]}
          >
            <Text
              style={mutationState.status === "success" ? styles.successText : styles.errorText}
            >
              {mutationState.message}
            </Text>
          </View>
        ) : null}

        {!isLoading && readyLogs ? (
          <View style={styles.mealsSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Comidas</Text>
                <Text style={styles.sectionDescription}>Tu registro para este día</Text>
              </View>
              <Text style={styles.foodCount}>
                {readyLogs.items.length} {readyLogs.items.length === 1 ? "alimento" : "alimentos"}
              </Text>
            </View>

            {readyLogs.items.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Utensils color={colors.primary} size={26} />
                </View>
                <Text style={styles.emptyTitle}>Tu día está listo para empezar</Text>
                <Text style={styles.emptyText}>
                  Agrega tu primera comida para ver calorías y macros consumidos.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  style={styles.emptyButton}
                  onPress={() => openAddFood()}
                >
                  <Plus color={colors.background} size={18} />
                  <Text style={styles.primaryButtonText}>Agregar alimento</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.mealGroups}>
                {getMealSections(readyLogs).map((section) => (
                  <View key={section.mealSlot} style={styles.mealGroup}>
                    <View style={styles.mealHeader}>
                      <View>
                        <Text style={styles.mealTitle}>{section.title}</Text>
                        <Text style={styles.mealMeta}>
                          {section.items.length === 0
                            ? "Sin alimentos"
                            : `${Math.round(
                                section.items.reduce((total, item) => total + item.kcal, 0)
                              )} kcal`}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityLabel={`Agregar alimento a ${section.title}`}
                        accessibilityRole="button"
                        hitSlop={8}
                        style={styles.addMealButton}
                        onPress={() => openAddFood(section.mealSlot)}
                      >
                        <Plus color={colors.primary} size={19} />
                      </Pressable>
                    </View>

                    {section.items.map((item) => (
                      <View key={item.id} style={styles.foodItem}>
                        <View style={styles.foodInfo}>
                          <Text numberOfLines={2} style={styles.foodName}>
                            {item.food_name ?? "Alimento"}
                          </Text>
                          <Text style={styles.foodMeta}>
                            {Math.round(item.quantity_g)} g · {Math.round(item.kcal)} kcal
                          </Text>
                        </View>
                        <View style={styles.foodActions}>
                          <Pressable
                            accessibilityLabel={`Editar ${item.food_name ?? "alimento"}`}
                            accessibilityRole="button"
                            hitSlop={8}
                            style={styles.smallIconButton}
                            onPress={() => beginEdit(item)}
                          >
                            <Pencil color={colors.textSubtle} size={17} />
                          </Pressable>
                          <Pressable
                            accessibilityLabel={`Borrar ${item.food_name ?? "alimento"}`}
                            accessibilityRole="button"
                            disabled={mutationState.status === "deleting"}
                            hitSlop={8}
                            style={styles.smallIconButton}
                            onPress={() => confirmDeleteFoodLog(item.id)}
                          >
                            <Trash2 color={colors.danger} size={17} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {!isLoading && logsState.status !== "success" ? (
          <ErrorPanel
            message={logsState.errorMessage ?? "No pudimos cargar tus alimentos del día."}
            title={getStatusLabel(logsState.status)}
            onRetry={logsState.reload}
          />
        ) : null}

        {!isLoading && targetsState.status !== "success" ? (
          <ErrorPanel
            message={targetsState.errorMessage ?? "No pudimos cargar tus objetivos nutricionales."}
            title={getStatusLabel(targetsState.status)}
            onRetry={targetsState.reload}
          />
        ) : null}

        {!isLoading && readyTargets && !readyLogs ? (
          <View style={styles.targetFallback}>
            <Text style={styles.sectionTitle}>Objetivos del día</Text>
            {getNutritionMacroCards(readyTargets).map((card) => (
              <View key={card.title} style={styles.targetRow}>
                <Text style={styles.targetLabel}>{card.title}</Text>
                <Text style={styles.targetValue}>{card.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {readyLogs && readyLogs.items.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.floatingButton, pressed ? styles.primaryPressed : null]}
          onPress={() => openAddFood()}
        >
          <Plus color={colors.background} size={20} strokeWidth={2.7} />
          <Text style={styles.primaryButtonText}>Agregar alimento</Text>
        </Pressable>
      ) : null}

      <FoodFormModal
        editInput={editInput}
        isOpen={isFoodModalOpen}
        mealSlot={mealSlot}
        mutationState={mutationState}
        quantityText={quantityText}
        saveState={saveState}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchState={searchState}
        selectedFood={selectedFood}
        onClose={closeFoodModal}
        onEditInputChange={setEditInput}
        onMealSlotChange={setMealSlot}
        onQuantityChange={setQuantityText}
        onRunSearch={() => {
          void runSearch();
        }}
        onSaveEdit={() => {
          void saveEditedFoodLog();
        }}
        onSaveFood={() => {
          void saveSelectedFood();
        }}
        onSearchQueryChange={setSearchQuery}
        onSelectFood={setSelectedFood}
      />
    </SafeAreaView>
  );
}

type FoodFormModalProps = {
  editInput: EditFoodLogInput | null;
  isOpen: boolean;
  mealSlot: MealSlotOption["value"];
  mutationState: FoodUiState;
  quantityText: string;
  saveState: FoodUiState;
  searchQuery: string;
  searchResults: FoodSearchItem[];
  searchState: FoodUiState;
  selectedFood: FoodSearchItem | null;
  onClose: () => void;
  onEditInputChange: (input: EditFoodLogInput | null) => void;
  onMealSlotChange: (slot: MealSlotOption["value"]) => void;
  onQuantityChange: (text: string) => void;
  onRunSearch: () => void;
  onSaveEdit: () => void;
  onSaveFood: () => void;
  onSearchQueryChange: (text: string) => void;
  onSelectFood: (food: FoodSearchItem) => void;
};

function FoodFormModal({
  editInput,
  isOpen,
  mealSlot,
  mutationState,
  quantityText,
  saveState,
  searchQuery,
  searchResults,
  searchState,
  selectedFood,
  onClose,
  onEditInputChange,
  onMealSlotChange,
  onQuantityChange,
  onRunSearch,
  onSaveEdit,
  onSaveFood,
  onSearchQueryChange,
  onSelectFood
}: FoodFormModalProps) {
  const isEditing = editInput !== null;
  const activeSlot = editInput?.mealSlot ?? mealSlot;
  const activeQuantity = editInput?.quantityText ?? quantityText;
  const isSaving = isEditing ? mutationState.status === "saving" : saveState.status === "saving";
  const message = isEditing ? mutationState.message : saveState.message;

  function setActiveSlot(slot: MealSlotOption["value"]) {
    if (editInput) {
      onEditInputChange({ ...editInput, mealSlot: slot });
      return;
    }
    onMealSlotChange(slot);
  }

  function setActiveQuantity(text: string) {
    if (editInput) {
      onEditInputChange({ ...editInput, quantityText: text });
      return;
    }
    onQuantityChange(text);
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isOpen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <Pressable accessibilityLabel="Cerrar formulario" style={styles.modalDismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>{isEditing ? "Registro diario" : "Nueva comida"}</Text>
              <Text style={styles.sheetTitle}>{isEditing ? "Editar alimento" : "Agregar alimento"}</Text>
            </View>
            <Pressable
              accessibilityLabel="Cerrar"
              accessibilityRole="button"
              style={styles.iconButton}
              onPress={onClose}
            >
              <X color={colors.text} size={21} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isEditing ? (
              <>
                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrap}>
                    <Search color={colors.muted} size={19} />
                    <TextInput
                      accessibilityLabel="Buscar alimento"
                      autoCapitalize="none"
                      onChangeText={onSearchQueryChange}
                      onSubmitEditing={onRunSearch}
                      placeholder="Ej. avena, pollo, arroz"
                      placeholderTextColor={colors.muted}
                      returnKeyType="search"
                      style={styles.searchInput}
                      value={searchQuery}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel="Buscar"
                    accessibilityRole="button"
                    disabled={searchState.status === "loading"}
                    style={[styles.searchButton, searchState.status === "loading" ? styles.disabled : null]}
                    onPress={onRunSearch}
                  >
                    {searchState.status === "loading" ? (
                      <ActivityIndicator color={colors.background} size="small" />
                    ) : (
                      <Search color={colors.background} size={20} />
                    )}
                  </Pressable>
                </View>

                {searchState.message ? (
                  <Text
                    style={
                      searchState.status === "network_error" || searchState.status === "error"
                        ? styles.errorText
                        : styles.helperText
                    }
                  >
                    {searchState.message}
                  </Text>
                ) : null}

                {searchResults.length > 0 ? (
                  <View style={styles.searchResults}>
                    {searchResults.map((food, index) => (
                      <Pressable
                        key={food.id ?? `${getFoodDisplayName(food)}-${index}`}
                        accessibilityRole="button"
                        disabled={!food.id}
                        style={[
                          styles.searchResult,
                          selectedFood?.id === food.id ? styles.selectedResult : null,
                          !food.id ? styles.disabled : null
                        ]}
                        onPress={() => onSelectFood(food)}
                      >
                        <Text style={styles.resultName}>{getFoodDisplayName(food)}</Text>
                        <Text style={styles.resultMeta}>{getFoodMacroSummary(food)}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Comida</Text>
              <View style={styles.segmentedControl}>
                {mealSlotOptions.map((option) => {
                  const selected = activeSlot === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[styles.segment, selected ? styles.selectedSegment : null]}
                      onPress={() => setActiveSlot(option.value)}
                    >
                      <Text style={[styles.segmentText, selected ? styles.selectedSegmentText : null]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cantidad</Text>
              <View style={styles.quantityInputWrap}>
                <TextInput
                  accessibilityLabel="Cantidad en gramos"
                  keyboardType="decimal-pad"
                  onChangeText={setActiveQuantity}
                  placeholder="100"
                  placeholderTextColor={colors.muted}
                  style={styles.quantityInput}
                  value={activeQuantity}
                />
                <Text style={styles.inputSuffix}>gramos</Text>
              </View>
            </View>

            {message ? <Text style={styles.errorText}>{message}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                isSaving ? styles.disabled : null,
                pressed ? styles.primaryPressed : null
              ]}
              onPress={isEditing ? onSaveEdit : onSaveFood}
            >
              {isSaving ? <ActivityIndicator color={colors.background} size="small" /> : null}
              <Text style={styles.primaryButtonText}>
                {isSaving ? "Guardando" : isEditing ? "Guardar cambios" : "Agregar al día"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ErrorPanel({
  message,
  title,
  onRetry
}: {
  message: string;
  title: string;
  onRetry: () => Promise<unknown>;
}) {
  return (
    <View style={styles.errorPanel}>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorDescription}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.retryButton}
        onPress={() => {
          void onRetry();
        }}
      >
        <RefreshCw color={colors.text} size={17} />
        <Text style={styles.retryText}>Intentar de nuevo</Text>
      </Pressable>
    </View>
  );
}

const statusLabel = {
  error: "No pudimos cargar Nutrición",
  forbidden: "Permiso denegado",
  missing_session: "Sesión no disponible",
  network_error: "Sin conexión con el backend",
  not_found: "No encontrado",
  session_expired: "Sesión expirada",
  unexpected_error: "Ocurrió un error",
  validation_error: "Solicitud rechazada"
} as const;

function getStatusLabel(status: string) {
  return status in statusLabel
    ? statusLabel[status as keyof typeof statusLabel]
    : "Cargando Nutrición";
}

type FoodUiState = {
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
  addMealButton: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  content: {
    paddingBottom: 104,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg
  },
  compactSummary: {
    alignItems: "center",
    flexDirection: "column"
  },
  compactMacroStack: {
    alignSelf: "stretch",
    width: "100%"
  },
  dateArrow: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  dateSelector: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs
  },
  dateText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 1
  },
  dateTitle: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  dateValue: {
    alignItems: "center",
    borderLeftColor: colors.border,
    borderLeftWidth: 1,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minWidth: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  disabled: {
    opacity: 0.5
  },
  emptyButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl
  },
  emptyText: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 21,
    maxWidth: 290,
    textAlign: "center"
  },
  emptyTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800",
    marginTop: spacing.xs,
    textAlign: "center"
  },
  errorDescription: {
    color: colors.textSubtle,
    fontSize: typography.body,
    lineHeight: 21
  },
  errorFeedback: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger
  },
  errorPanel: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.lg
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.label,
    fontWeight: "700"
  },
  errorTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800"
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  feedback: {
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.md
  },
  fieldGroup: {
    gap: spacing.sm
  },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: typography.label,
    fontWeight: "800"
  },
  floatingButton: {
    ...shadows.elevated,
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    bottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    position: "absolute"
  },
  foodActions: {
    flexDirection: "row",
    gap: spacing.xs
  },
  foodCount: {
    color: colors.muted,
    fontSize: typography.caption,
    fontWeight: "700"
  },
  foodInfo: {
    flex: 1,
    paddingRight: spacing.sm
  },
  foodItem: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 66,
    paddingVertical: spacing.md
  },
  foodMeta: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: spacing.xs
  },
  foodName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "700",
    lineHeight: 20
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  helperText: {
    color: colors.muted,
    fontSize: typography.label,
    lineHeight: 18
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  inputSuffix: {
    color: colors.muted,
    fontSize: typography.body,
    fontWeight: "600"
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.xxxl
  },
  loadingText: {
    color: colors.textSubtle,
    fontSize: typography.body
  },
  macroStack: {
    flex: 1,
    gap: spacing.lg,
    minWidth: 150
  },
  mealGroup: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg
  },
  mealGroups: {
    gap: spacing.md
  },
  mealHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62
  },
  mealMeta: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 2
  },
  mealTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "800"
  },
  mealsSection: {
    gap: spacing.lg
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    flex: 1,
    justifyContent: "flex-end"
  },
  modalDismissArea: {
    flex: 1
  },
  modalPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg
  },
  pageTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  pressed: {
    backgroundColor: colors.surfaceElevated
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: typography.body,
    fontWeight: "900"
  },
  primaryPressed: {
    backgroundColor: colors.primaryPressed
  },
  quantityInput: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    paddingVertical: spacing.md
  },
  quantityInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: spacing.lg
  },
  resultMeta: {
    color: colors.muted,
    fontSize: typography.caption,
    marginTop: 3
  },
  resultName: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  },
  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  retryText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "800"
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    paddingVertical: spacing.md
  },
  searchInputWrap: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  searchResult: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: spacing.md
  },
  searchResults: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: "hidden"
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: typography.label,
    marginTop: 2
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.title,
    fontWeight: "900"
  },
  segment: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexGrow: 1,
    minWidth: "45%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  segmentText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: "700"
  },
  segmentedControl: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    padding: spacing.xs
  },
  selectedResult: {
    backgroundColor: colors.primarySoft
  },
  selectedSegment: {
    backgroundColor: colors.primarySoft
  },
  selectedSegmentText: {
    color: colors.primary,
    fontWeight: "900"
  },
  sheet: {
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: "88%",
    minHeight: "52%",
    overflow: "hidden"
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingHorizontal: spacing.lg
  },
  sheetEyebrow: {
    color: colors.primary,
    fontSize: typography.caption,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.borderStrong,
    borderRadius: radii.pill,
    height: 4,
    marginTop: spacing.sm,
    width: 42
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.lg
  },
  sheetTitle: {
    color: colors.text,
    fontSize: typography.heading,
    fontWeight: "900",
    marginTop: 2
  },
  smallIconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  successFeedback: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success
  },
  successText: {
    color: colors.success,
    fontSize: typography.label,
    fontWeight: "800"
  },
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xl,
    marginBottom: spacing.xl,
    padding: spacing.lg
  },
  targetFallback: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    gap: spacing.md,
    padding: spacing.lg
  },
  targetLabel: {
    color: colors.textSubtle,
    fontSize: typography.body
  },
  targetRow: {
    alignItems: "center",
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.md
  },
  targetValue: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "800"
  }
});
