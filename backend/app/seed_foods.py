import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")
supabase: Client = create_client(url, key)

# Muestra de los 100 alimentos (Estructura expandible)
FOOD_DATA = [
    # FRUTAS
    {"name_es": "Manzana", "variant": "Roja con cáscara", "category": "Frutas", "calories_per_g": 0.52, "protein_per_g": 0.003, "carbs_per_g": 0.14, "fat_per_g": 0.002, "potassium_mg_per_g": 1.07, "vitamin_c_mg_per_g": 0.046, "default_portion_grams": 182},
    {"name_es": "Manzana", "variant": "Verde (Granny Smith)", "category": "Frutas", "calories_per_g": 0.58, "protein_per_g": 0.004, "carbs_per_g": 0.14, "fat_per_g": 0.002, "potassium_mg_per_g": 1.20, "vitamin_c_mg_per_g": 0.08, "default_portion_grams": 170},
    {"name_es": "Plátano", "variant": "Maduro", "category": "Frutas", "calories_per_g": 0.89, "protein_per_g": 0.011, "carbs_per_g": 0.23, "fat_per_g": 0.003, "potassium_mg_per_g": 3.58, "vitamin_c_mg_per_g": 0.087, "default_portion_grams": 120},
    {"name_es": "Arándanos", "variant": "Frescos", "category": "Frutas", "calories_per_g": 0.57, "protein_per_g": 0.007, "carbs_per_g": 0.14, "fat_per_g": 0.003, "potassium_mg_per_g": 0.77, "vitamin_c_mg_per_g": 0.097, "default_portion_grams": 150},
    
    # PROTEÍNAS
    {"name_es": "Pechuga de Pollo", "variant": "A la plancha", "category": "Proteínas", "calories_per_g": 1.65, "protein_per_g": 0.31, "carbs_per_g": 0.0, "fat_per_g": 0.036, "potassium_mg_per_g": 2.56, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 150},
    {"name_es": "Huevo", "variant": "Entero Hervido", "category": "Proteínas", "calories_per_g": 1.55, "protein_per_g": 0.13, "carbs_per_g": 0.011, "fat_per_g": 0.11, "potassium_mg_per_g": 1.26, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 50},
    {"name_es": "Salmón", "variant": "Fresco / Al horno", "category": "Proteínas", "calories_per_g": 2.08, "protein_per_g": 0.20, "carbs_per_g": 0.0, "fat_per_g": 0.13, "potassium_mg_per_g": 3.63, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 150},
    {"name_es": "Carne de Res", "variant": "Magra 90/10", "category": "Proteínas", "calories_per_g": 1.76, "protein_per_g": 0.26, "carbs_per_g": 0.0, "fat_per_g": 0.10, "potassium_mg_per_g": 3.18, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 150},

    # CARBOHIDRATOS COMPLEJOS
    {"name_es": "Arroz Blanco", "variant": "Cocido", "category": "Carbohidratos", "calories_per_g": 1.30, "protein_per_g": 0.027, "carbs_per_g": 0.28, "fat_per_g": 0.003, "potassium_mg_per_g": 0.35, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 200},
    {"name_es": "Avena", "variant": "En hojuelas (seco)", "category": "Carbohidratos", "calories_per_g": 3.89, "protein_per_g": 0.169, "carbs_per_g": 0.66, "fat_per_g": 0.069, "potassium_mg_per_g": 4.29, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 40},
    {"name_es": "Papa / Patata", "variant": "Hervida sin piel", "category": "Carbohidratos", "calories_per_g": 0.87, "protein_per_g": 0.019, "carbs_per_g": 0.20, "fat_per_g": 0.001, "potassium_mg_per_g": 3.79, "vitamin_c_mg_per_g": 0.13, "default_portion_grams": 150},
    
    # GRASAS SALUDABLES
    {"name_es": "Aguacate / Palta", "variant": "Hass", "category": "Grasas", "calories_per_g": 1.60, "protein_per_g": 0.02, "carbs_per_g": 0.085, "fat_per_g": 0.147, "potassium_mg_per_g": 4.85, "vitamin_c_mg_per_g": 0.10, "default_portion_grams": 100},
    {"name_es": "Almendras", "variant": "Naturales", "category": "Grasas", "calories_per_g": 5.79, "protein_per_g": 0.21, "carbs_per_g": 0.22, "fat_per_g": 0.50, "potassium_mg_per_g": 7.33, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 30},
    # --- VEGETALES (MICROS & FIBRA) ---
    {"name_es": "Brócoli", "variant": "Hervido / Al vapor", "category": "Vegetales", "calories_per_g": 0.35, "protein_per_g": 0.024, "carbs_per_g": 0.07, "fat_per_g": 0.004, "potassium_mg_per_g": 3.16, "vitamin_c_mg_per_g": 0.65, "default_portion_grams": 150},
    {"name_es": "Espinaca", "variant": "Cruda", "category": "Vegetales", "calories_per_g": 0.23, "protein_per_g": 0.029, "carbs_per_g": 0.036, "fat_per_g": 0.004, "potassium_mg_per_g": 5.58, "vitamin_c_mg_per_g": 0.28, "default_portion_grams": 30},
    {"name_es": "Zanahoria", "variant": "Cruda", "category": "Vegetales", "calories_per_g": 0.41, "protein_per_g": 0.009, "carbs_per_g": 0.10, "fat_per_g": 0.002, "potassium_mg_per_g": 3.20, "vitamin_c_mg_per_g": 0.06, "default_portion_grams": 60},
    {"name_es": "Calabacín", "variant": "Zucchini / Verde", "category": "Vegetales", "calories_per_g": 0.17, "protein_per_g": 0.012, "carbs_per_g": 0.03, "fat_per_g": 0.003, "potassium_mg_per_g": 2.61, "vitamin_c_mg_per_g": 0.18, "default_portion_grams": 150},
    {"name_es": "Espárragos", "variant": "A la plancha", "category": "Vegetales", "calories_per_g": 0.20, "protein_per_g": 0.022, "carbs_per_g": 0.039, "fat_per_g": 0.001, "potassium_mg_per_g": 2.02, "vitamin_c_mg_per_g": 0.06, "default_portion_grams": 100},
    {"name_es": "Pimiento Rojo", "variant": "Crudo", "category": "Vegetales", "calories_per_g": 0.31, "protein_per_g": 0.01, "carbs_per_g": 0.06, "fat_per_g": 0.003, "potassium_mg_per_g": 2.11, "vitamin_c_mg_per_g": 1.28, "default_portion_grams": 100},
    
    # --- LEGUMBRES (PROTEÍNA VEGETAL & FIBRA) ---
    {"name_es": "Lentejas", "variant": "Cocidas / Hervidas", "category": "Legumbres", "calories_per_g": 1.16, "protein_per_g": 0.09, "carbs_per_g": 0.20, "fat_per_g": 0.004, "potassium_mg_per_g": 3.69, "vitamin_c_mg_per_g": 0.015, "default_portion_grams": 200},
    {"name_es": "Garbanzos", "variant": "Cocidos", "category": "Legumbres", "calories_per_g": 1.64, "protein_per_g": 0.089, "carbs_per_g": 0.27, "fat_per_g": 0.026, "potassium_mg_per_g": 2.91, "vitamin_c_mg_per_g": 0.01, "default_portion_grams": 200},
    {"name_es": "Frijoles Negros", "variant": "Cocidos", "category": "Legumbres", "calories_per_g": 1.32, "protein_per_g": 0.089, "carbs_per_g": 0.23, "fat_per_g": 0.005, "potassium_mg_per_g": 3.55, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 200},
    
    # --- CARBOHIDRATOS DE RENDIMIENTO ---
    {"name_es": "Camote", "variant": "Batata / Sweet Potato", "category": "Carbohidratos", "calories_per_g": 0.86, "protein_per_g": 0.016, "carbs_per_g": 0.20, "fat_per_g": 0.001, "potassium_mg_per_g": 3.37, "vitamin_c_mg_per_g": 0.02, "default_portion_grams": 150},
    {"name_es": "Quinoa", "variant": "Cocida", "category": "Carbohidratos", "calories_per_g": 1.20, "protein_per_g": 0.044, "carbs_per_g": 0.21, "fat_per_g": 0.019, "potassium_mg_per_g": 1.72, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 150},
    {"name_es": "Pan Integral", "variant": "Trigo sarraceno / Semillas", "category": "Carbohidratos", "calories_per_g": 2.47, "protein_per_g": 0.13, "carbs_per_g": 0.41, "fat_per_g": 0.03, "potassium_mg_per_g": 2.23, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 40},
    {"name_es": "Pasta Integral", "variant": "Cocida al dente", "category": "Carbohidratos", "calories_per_g": 1.24, "protein_per_g": 0.053, "carbs_per_g": 0.26, "fat_per_g": 0.005, "potassium_mg_per_g": 0.44, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 150},
    
    # --- LÁCTEOS & BIO-ALTERNATIVAS ---
    {"name_es": "Yogur Griego", "variant": "Natural 0% Grasa", "category": "Lácteos", "calories_per_g": 0.59, "protein_per_g": 0.10, "carbs_per_g": 0.036, "fat_per_g": 0.004, "potassium_mg_per_g": 1.41, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 200},
    {"name_es": "Leche Desnatada", "variant": "Vaca 0% Grasa", "category": "Lácteos", "calories_per_g": 0.34, "protein_per_g": 0.034, "carbs_per_g": 0.05, "fat_per_g": 0.001, "potassium_mg_per_g": 1.50, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 240},
    {"name_es": "Queso Cottage", "variant": "Bajo en grasa", "category": "Lácteos", "calories_per_g": 0.82, "protein_per_g": 0.11, "carbs_per_g": 0.04, "fat_per_g": 0.02, "potassium_mg_per_g": 1.04, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 100},
    
    # --- FRUTOS SECOS & GRASAS ---
    {"name_es": "Nueces", "variant": "Peladas", "category": "Grasas", "calories_per_g": 6.54, "protein_per_g": 0.15, "carbs_per_g": 0.14, "fat_per_g": 0.65, "potassium_mg_per_g": 4.41, "vitamin_c_mg_per_g": 0.01, "default_portion_grams": 30},
    {"name_es": "Mantequilla de Maní", "variant": "Natural / Cacahuete", "category": "Grasas", "calories_per_g": 5.88, "protein_per_g": 0.25, "carbs_per_g": 0.20, "fat_per_g": 0.50, "potassium_mg_per_g": 6.49, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 20},
    {"name_es": "Aceite de Oliva", "variant": "Extra Virgen", "category": "Grasas", "calories_per_g": 8.84, "protein_per_g": 0.0, "carbs_per_g": 0.0, "fat_per_g": 1.0, "potassium_mg_per_g": 0.01, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 15},
    
    # --- PESCADOS & MARISCOS ---
    {"name_es": "Atún en Agua", "variant": "Lata / Escurrido", "category": "Proteínas", "calories_per_g": 1.16, "protein_per_g": 0.26, "carbs_per_g": 0.0, "fat_per_g": 0.01, "potassium_mg_per_g": 2.37, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 120},
    {"name_es": "Camarones", "variant": "Cocidos / Al vapor", "category": "Proteínas", "calories_per_g": 0.99, "protein_per_g": 0.24, "carbs_per_g": 0.0, "fat_per_g": 0.003, "potassium_mg_per_g": 2.59, "vitamin_c_mg_per_g": 0.0, "default_portion_grams": 100},
    
    # --- FRUTAS ADICIONALES ---
    {"name_es": "Papaya", "variant": "Fresca", "category": "Frutas", "calories_per_g": 0.43, "protein_per_g": 0.005, "carbs_per_g": 0.11, "fat_per_g": 0.003, "potassium_mg_per_g": 1.82, "vitamin_c_mg_per_g": 0.62, "default_portion_grams": 150},
    {"name_es": "Piña", "variant": "Fresca / Rodajas", "category": "Frutas", "calories_per_g": 0.50, "protein_per_g": 0.005, "carbs_per_g": 0.13, "fat_per_g": 0.001, "potassium_mg_per_g": 1.09, "vitamin_c_mg_per_g": 0.47, "default_portion_grams": 150},
    {"name_es": "Kiwi", "variant": "Fresco / Sin piel", "category": "Frutas", "calories_per_g": 0.61, "protein_per_g": 0.011, "carbs_per_g": 0.15, "fat_per_g": 0.005, "potassium_mg_per_g": 3.12, "vitamin_c_mg_per_g": 0.92, "default_portion_grams": 70},
]

def seed_database():
    print("🚀 Iniciando Protocolo de Inyección de Bio-Base...")
    try:
        # Nota: He quitado el .delete() para no borrar tus IDs actuales
        result = supabase.table("catalog_foods").upsert(FOOD_DATA, on_conflict="name_es,variant").execute()
        print(f"✅ Protocolo completado. {len(result.data)} alimentos estandarizados.")
    except Exception as e:
        print(f"❌ Fallo en la inyección: {e}")

if __name__ == "__main__":
    seed_database()