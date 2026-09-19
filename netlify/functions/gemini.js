// Archivo: netlify/functions/gemini.js

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const cuerpo = JSON.parse(event.body);
        const prompt = cuerpo.prompt;
        const modelo = cuerpo.modelo;
        
        const API_KEY = process.env.GEMINI_API_KEY;

        const urlGemini = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${API_KEY}`;
        
        const response = await fetch(urlGemini, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        const data = await response.json();

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error("Error en Netlify Function:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error interno del servidor", detalle: error.message }) };
    }
};
