// server.js
import express from 'express';
import cors from 'cors';
import sql from 'mssql';
import fetch from 'node-fetch';
import { queries } from './consultas.js';

const app = express();
const port = 3001;

app.use(express.json());
app.use(cors());

const dbConfig = {
  user: 'DanielCT_SQLLogin_1',
  password: 'Trujillodani64',
  server: 'TiendaMicroserviciosAutorApi.mssql.somee.com',
  database: 'TiendaMicroserviciosAutorApi',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function interpretarPrompt(prompt) {
  const promptOllama = `
Convierte la siguiente solicitud del usuario en una de estas claves exactas:
${Object.keys(queries).join('\n')}
Si no coincide, responde solo con: desconocido.

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

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
