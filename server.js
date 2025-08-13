import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt es requerido.' });
  }

  try {
    const response = await fetch('http://host.docker.internal:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen3:1.7b',
        prompt: prompt,
        stream: false
      })
    });

    const data = await response.json();

    let respuestaLimpia = data.response;

    // Quitar todo lo que esté entre <think> y </think> (incluyendo etiquetas)
    respuestaLimpia = respuestaLimpia.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

    res.json({
      model: data.model,
      created_at: data.created_at,
      response: respuestaLimpia,
      done: data.done,
      done_reason: data.done_reason
    });
  } catch (error) {
    console.error('Error al enviar solicitud a Ollama:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.listen(port, () => {
  console.log(`API escuchando en http://localhost:${port}`);
});
