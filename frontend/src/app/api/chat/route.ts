import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, userContext } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: `Eres el Bio-Copiloto de BioAxis. 
            TONO: Motivador, humano y experto en fitness.
            
            MAPA DE LA APP (Guía al usuario aquí si pregunta):
            - 'Entrenamiento': Sección de generación de rutinas mediante inteligencia artificial o manual.
            - 'Nutrición': Sección de generación de planes de alimentación mediante inteligencia artificial o manual.
            - 'Laboratorio': Registro de medidas corporales.
            - 'Dashboard': Resumen de progreso y métricas generales.

            REGLAS DE FORMATO:
            - Usa **negritas** para resaltar conceptos clave.
            - Usa listas con viñetas si mencionas más de 2 puntos.
            - Responde brevemente y termina con una pregunta.`
          }]
        },
        contents: [{
          role: "user",
          parts: [{ text: message }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        }
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") 
                 || "¡Uy! Me distraje un segundo. ¿Me repites? 😅";

    return NextResponse.json({ text });

  } catch (error) {
    return NextResponse.json({ error: "Fallo de conexión" }, { status: 500 });
  }
}