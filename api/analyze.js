export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { messages, system } = req.body;

    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(msg.content)
        ? msg.content.map(c => {
            if (c.type === 'text') return { text: c.text };
            if (c.type === 'document') return {
              inlineData: {
                mimeType: 'application/pdf',
                data: c.source.data
              }
            };
            return { text: '' };
          })
        : [{ text: msg.content }]
    }));

    const body = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents,
      generationConfig: {
        maxOutputTokens: 8192,
      }
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    console.log('Gemini status:', response.status);
    console.log('Gemini response:', JSON.stringify(data).slice(0, 500));

    if (data.candidates && data.candidates[0]) {
      const text = data.candidates[0].content.parts[0].text;
      res.status(200).json({
        content: [{ type: 'text', text }]
      });
    } else {
      res.status(500).json({ error: 'No response from Gemini', details: data });
    }
  } catch (error) {
    console.log('Catch error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
