// server.js
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import fetch from 'node-fetch';
import { queries } from './consultas.js';
import { consulta_db } from './consultas_ventas_digsm.js';

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

const dbConfig = {
  user: 'DanielCT_SQLLogin_1',
  password: 'Trujillodani64',
  server: 'http://DatabaseIAPrediction.mssql.somee.com',
  database: 'DatabaseIAPrediction',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};


 const dbConfig_DIMGS = {
  user: 'sa',
  password: '123456',
  server: 'localhost',   // tu máquina local
  database: 'DMIDGS',   // la base de datos a la que quieres conectar
  options: {
    encrypt: false,             // en local normalmente es false
    trustServerCertificate: true,
    //instanceName: 'Emmanuel'    // tu instancia nombrada
  }

};


async function interpretarPrompt(prompt) {
  const promptOllama = `
Convierte la siguiente solicitud del usuario en una de estas claves exactas:
${Object.keys(queries).join('\n')}
Si no coincide, responde solo con: desconocido.

Ejemplos:
- "necesito predecir las ventas" → prediccion_ventas
- "qué clientes podrían dejar de comprar" → clientes_riesgo_abandono
- "cuáles productos serán más populares" → productos_tendencia
- "clasifica a los clientes por valor" → segmentacion_clientes

Solicitud: "${prompt}"
  `;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3:1.7b',
      prompt: promptOllama,
      stream: false
    })
  });

  const data = await response.json();
  let clave = data.response
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim()
    .split(/\s+/)[0];

  return clave;
}

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt es requerido.' });
  }

  try {
    const clave = await interpretarPrompt(prompt);

    if (!queries[clave]) {
      return res.status(400).json({ error: 'No se encontró una consulta para esta solicitud.' });
    }

    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(queries[clave]);
    await pool.close();

    res.json({
      tipo: clave,
      datos: result.recordset
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/chat-todas', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt es requerido.' });
  }

  try {
    const pool = await sql.connect(dbConfig);

    // Ejecutar todas las consultas
    const consultas = {
      direcciones: 'SELECT * FROM SalesLT.Address;',
      clientes: 'SELECT * FROM SalesLT.Customer;',
      clientes_direcciones: 'SELECT * FROM SalesLT.CustomerAddress;',
      productos: 'SELECT * FROM SalesLT.Product;',
      categorias: 'SELECT * FROM SalesLT.ProductCategory;',
      descripciones: 'SELECT * FROM SalesLT.ProductDescription;',
      modelos: 'SELECT * FROM SalesLT.ProductModel;',
      modelo_descripcion: 'SELECT * FROM SalesLT.ProductModelProductDescription;',
      detalles_orden: 'SELECT * FROM SalesLT.SalesOrderDetail;',
      cabeceras_orden: 'SELECT * FROM SalesLT.SalesOrderHeader;'
    };

    const resultados = {};

    for (const [key, queryStr] of Object.entries(consultas)) {
      const result = await pool.request().query(queryStr);
      resultados[key] = result.recordset;
    }

    await pool.close();

    // Preparar el prompt para la IA
    const promptOllama = `
El usuario hizo la siguiente solicitud: "${prompt}"
Aquí están todos los datos disponibles de la base de datos en JSON:
${JSON.stringify(resultados)}
Responde según la solicitud del usuario.
    `;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: promptOllama,
        stream: false
      })
    });

    const data = await response.json();
    

    res.json({
      prompt,
      respuestaIA: data.response,
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});

// server.js (añade estos nuevos endpoints)

//#region Endpoint para predicción de ventas
app.post('/api/predict/sales', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(queries.prediccion_ventas);
    await pool.close();
    
    // Preparar prompt para la predicción
    const prompt = `
      Basado en los siguientes datos históricos de ventas:
      ${JSON.stringify(result.recordset)}
      
      Realiza una predicción de ventas para los próximos 3 meses considerando:
      1. Tendencia histórica
      2. Estacionalidad
      3. Crecimiento promedio
      
      Devuelve la predicción en formato JSON con:
      - Meses proyectados
      - Valores estimados
      - Nivel de confianza (alto, medio, bajo)
      - Factores clave que influyen
    `;
    
    const iaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      })
    });
    
    const data = await iaResponse.json();
    res.json(JSON.parse(data.response));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en la predicción de ventas' });
  }
});

// Endpoint para clientes en riesgo de abandono
app.post('/api/predict/churn', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(queries.clientes_riesgo_abandono);
    await pool.close();
    
    const prompt = `
      Analiza estos clientes y determina cuáles tienen mayor riesgo de abandono:
      ${JSON.stringify(result.recordset)}
      
      Clasifícalos en:
      1. Alto riesgo (no compra hace más de 90 días)
      2. Riesgo medio (no compra entre 60-90 días)
      3. Bajo riesgo (no compra menos de 60 días)
      
      Para cada grupo, sugiere estrategias de retención.
      
      Formato de respuesta JSON:
      {
        "alto_riesgo": [],
        "medio_riesgo": [],
        "bajo_riesgo": [],
        "estrategias": {
          "alto_riesgo": [],
          "medio_riesgo": [],
          "bajo_riesgo": []
        }
      }
    `;
    
    const iaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      })
    });
    
    const data = await iaResponse.json();
    res.json(JSON.parse(data.response));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en la predicción de abandono' });
  }
});

// Endpoint para productos en tendencia
app.post('/api/predict/trending-products', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(queries.productos_tendencia);
    await pool.close();
    
    const prompt = `
      Analiza estos datos de productos vendidos:
      ${JSON.stringify(result.recordset)}
      
      Predice cuáles serán los 5 productos con mayor demanda en el próximo trimestre.
      Considera:
      1. Tendencias históricas
      2. Crecimiento reciente
      3. Estacionalidad
      
      Formato de respuesta JSON:
      {
        "top_products": [
          {
            "product_id": "",
            "name": "",
            "projected_sales": "",
            "growth_rate": "",
            "confidence": ""
          }
        ],
        "insights": ""
      }
    `;
    
    const iaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      })
    });
    
    const data = await iaResponse.json();
    res.json(JSON.parse(data.response));
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en la predicción de productos' });
  }
});

////////////////////////
// CONSULTAS DB DMIGS //
////////////////////////


app.post('/api/predict/sales/DMIDGS', async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig_DIMGS);
    const result = await pool.request().query(consulta_db.prediccion_ventas);
    await pool.close();

    // Preparar prompt para la predicción
    const prompt = `
      Basado en los siguientes datos históricos de ventas:
      ${JSON.stringify(result.recordset)}

      Realiza una predicción de ventas para los próximos 3 meses considerando:
      1. Tendencia histórica
      2. Estacionalidad
      3. Crecimiento promedio

      Devuelve la predicción en formato JSON con:
      - Meses proyectados
      - Valores estimados
      - Nivel de confianza (alto, medio, bajo)
      - Factores clave que influyen
    `;

    // Llamada a la API de Qwen3
    const iaResponse = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      })
    });

    const data = await iaResponse.json();

    // Intentamos parsear JSON; si falla, devolvemos el texto tal cual
    let prediction;
    try {
      prediction = JSON.parse(data.response);
    } catch {
      prediction = { raw: data.response };
    }

    res.json(prediction);

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error en la predicción de ventas' });
  }
});
