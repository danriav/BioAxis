import { getSupabaseClient } from "@/lib/supabase/client";

export async function registerWorkout(workoutData: any) {
  const supabase = getSupabaseClient();
  
  if (!supabase) {
    throw new Error("No se pudo inicializar el cliente de Supabase.");
  }

  // 1. Obtener el usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sesión no válida o usuario no autenticado.");
  }

  // 2. REGLA DE ORO: Obtener el biometria_id actual del atleta (SCD2)
  const { data: bioData, error: bioError } = await supabase
    .from("dim_atleta")
    .select("biometria_id")
    .eq("user_id", user.id)
    .order("valid_from", { ascending: false }) // Trae el último insertado / actual
    .limit(1)
    .single();

  if (bioError || !bioData) {
    throw new Error("No se encontró un perfil biométrico activo (dim_atleta) para el usuario.");
  }

  const biometria_id = bioData.biometria_id;

  // 3. Insertar el entrenamiento en fact_entrenamientos
  const { data, error: insertError } = await supabase
    .from("fact_entrenamientos")
    .insert({
      user_id: user.id,
      biometria_id: biometria_id, // Vinculación SCD2
      ...workoutData
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Error al registrar el entrenamiento: ${insertError.message}`);
  }

  return data;
}
