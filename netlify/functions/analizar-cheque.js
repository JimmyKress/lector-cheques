// Netlify Function para analizar cheques con Google Gemini (GRATIS)
// Esta función se ejecuta en el servidor de Netlify, no en el browser

const PROMPT = `Las imágenes son fotos de cheques argentinos (puede haber varios cheques en una misma foto, uno debajo del otro, y pueden estar algo inclinados).
Devolvé un objeto por cada cheque, en orden de arriba hacia abajo.
Respondé solo con un arreglo JSON con este formato:
[{"fecha_cobro":"2026-10-29","monto":759792.63,"banco":"MACRO","nro_cheque":"67975893","razon_social":"CONSTRUCTORA AR S.R.L.","cuit":"30-71241044-9","advertencia":""}]

Reglas:
- fecha_cobro: la fecha de pago del cheque (la línea que empieza con "EL", por ejemplo "EL 29 DE OCTUBRE DE 2026", casi siempre escrita a mano). No es la fecha de emisión que va junto a la ciudad ("S.M. DE TUCUMAN, 9 de octubre de 2026"). Formato AAAA-MM-DD.
- monto: el número del recuadro del importe (signo $), como número con punto decimal y sin separador de miles.
- Verificá que el monto coincida con el importe escrito en letras. Si no coincide o hay dudas, explicalo en advertencia.
- banco: el banco emisor, según el logo o el texto impreso en el cheque (el logo puede estar girado). Escribilo en mayúsculas y solo con el nombre, por ejemplo MACRO, SANTANDER, GALICIA, CREDICOOP, NACION, PROVINCIA, CIUDAD, HSBC, ICBC, BBVA.
- nro_cheque: el número de serie impreso del cheque (el recuadro negro junto a "SERIE", que se repite en la banda inferior). Solo dígitos.
- cuit y razon_social: los del firmante (titular de la cuenta), impresos debajo de "CTA.", no los del beneficiario de "PÁGUESE A". La razón social es el nombre del titular (por ejemplo CONSTRUCTORA AR S.R.L.), sin la dirección que a veces va en la misma línea. CUIT con formato XX-XXXXXXXX-X, aunque esté impreso sin guiones.
- Si un dato no se lee con claridad, ponelo en null y explicalo en advertencia. No inventes datos.`;

exports.handler = async (event, context) => {
  console.log('Función llamada - método:', event.httpMethod);
  
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    // Parsear el body que viene del frontend
    const { imageBase64 } = JSON.parse(event.body);

    if (!imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Falta la imagen en base64' })
      };
    }

    // La API key viene de las variables de entorno de Netlify
    const apiKey = process.env.API_KEY;
    console.log('API Key presente:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'API_KEY no configurada en Netlify' })
      };
    }

    // Llamar a la API de Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: PROMPT
            },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de Gemini API:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: 'Error al llamar a Gemini API',
          details: errorData
        })
      };
    }

    const data = await response.json();
    
    // Extraer el texto de la respuesta de Gemini
    const textoRespuesta = data.candidates[0].content.parts[0].text;
    
    // Parsear el JSON que viene en el texto
    // Gemini a veces envuelve el JSON en ```json ... ```
    let jsonMatch = textoRespuesta.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'No se pudo extraer JSON de la respuesta',
          respuesta: textoRespuesta
        })
      };
    }

    const cheques = JSON.parse(jsonMatch[0]);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cheques })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        message: error.message
      })
    };
  }
};
