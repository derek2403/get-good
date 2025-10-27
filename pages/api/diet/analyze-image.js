export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const API_URL = 'https://api.redpill.ai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4.1-nano';

const parseNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value * 10) / 10);
  }

  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, Math.round(parsed * 10) / 10);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CONFIDENTIAL_AI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'AI service is not configured' });
  }

  const { imageBase64, mimeType } = req.body || {};
  const model = process.env.CONFIDENTIAL_AI_MODEL || DEFAULT_MODEL;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing image data' });
  }

  const systemPrompt = [
    'You are an experienced nutrition coach.',
    'Given a photo of food encoded as base64, identify the most likely dish and estimate calories (kcal), protein (g), carbs (g), and fat (g).',
    'Respond with strict JSON matching the schema: {"name": string, "calories": number, "protein": number, "carbs": number, "fat": number}.',
    'If multiple foods are visible, pick the dominant portion and include everything visible (sauces, sides).',
    'If unsure, make the best reasonable estimate and still return numbers.',
  ].join(' ');

  const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

  const userPrompt = [
    {
      type: 'text',
      text: 'Analyze the attached food photo and respond with JSON only.',
    },
    {
      type: 'image_url',
      image_url: {
        url: imageDataUrl,
        detail: 'low',
      },
    },
    {
      type: 'text',
      text: 'Remember: JSON only, no explanations.',
    },
  ];
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: {
          type: 'json_object',
        },
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const details =
        typeof data === 'object' && data !== null
          ? data.error || data.message || JSON.stringify(data)
          : response.statusText || 'Unknown error';
      console.error('Confidential AI request failed', details);
      return res.status(response.status).json({ error: 'AI request failed', details });
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'No response from AI service' });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      return res.status(500).json({ error: 'AI response was not valid JSON', details: parseError.message });
    }

    const meal = {
      name: (parsed.name || '').toString().trim() || 'Logged meal',
      calories: parseNumber(parsed.calories),
      protein: parseNumber(parsed.protein),
      carbs: parseNumber(parsed.carbs),
      fat: parseNumber(parsed.fat),
    };

    return res.status(200).json({ success: true, meal });
  } catch (error) {
    console.error('AI analysis failed:', error);
    return res.status(500).json({ error: 'Failed to analyze food image', details: error.message });
  }
}
