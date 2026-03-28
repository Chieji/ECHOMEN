import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialize AI provider
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * POST /api/ai
 * Proxy endpoint for AI generation requests
 * SECURITY: API keys never touch the frontend
 */
router.post('/api/ai', async (req, res) => {
  try {
    const { model, prompt, systemPrompt } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.length > 50000) {
      return res.status(400).json({
        error: 'Invalid prompt',
        message: 'Prompt must be a non-empty string under 50,000 characters'
      });
    }

    // Get the generative model
    const modelName = model ?? 'gemini-2.5-flash';
    const genModel = genAI.getGenerativeModel({
      model: modelName,
      safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }
      ]
    });

    // Prepare generation config
    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    // Build the request
    const requestParts = [];

    if (systemPrompt) {
      requestParts.push({ text: `System: ${systemPrompt}\n\n` });
    }

    requestParts.push({ text: prompt });

    // Generate content
    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: requestParts }],
      generationConfig,
    });

    const response = result.response;
    const text = response.text();

    // Send response
    res.json({
      text,
      usage: {
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
      },
      model: modelName,
      provider: 'google'
    });

  } catch (error) {
    console.error('AI Proxy Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('API_KEY_INVALID')) {
        return res.status(401).json({
          error: 'Invalid API configuration',
          message: 'The API key is invalid or missing'
        });
      }

      if (error.message.includes('SAFETY')) {
        return res.status(400).json({
          error: 'Content blocked',
          message: 'The request was blocked due to safety concerns'
        });
      }
    }

    res.status(500).json({
      error: 'Generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
