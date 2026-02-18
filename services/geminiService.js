/**
 * Talisay AI — Gemini Chatbot Service
 * Integrates with Google Gemini API (free tier) for AI-powered conversations
 * about Talisay trees, oil extraction, and related topics.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

// API key from environment variable
const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey
  || process.env.EXPO_PUBLIC_GEMINI_API_KEY
  || '';

// System instruction to give the chatbot context about Talisay
const SYSTEM_INSTRUCTION = `You are TalisAI, an expert AI assistant specialized in Talisay trees (Terminalia catappa), also known as Indian Almond trees. You are part of the Talisay AI research application developed for studying Talisay fruit oil yield.

Your areas of expertise include:
1. **Talisay Tree Biology**: Terminalia catappa characteristics, growth patterns, habitat, distribution across the Philippines and tropics
2. **Oil Extraction**: Kernel oil yield (38-65%), extraction methods, oil properties and composition
3. **Fruit Analysis**: Color classification (Green/Yellow/Brown), maturity stages (Immature/Semi-ripe/Overripe), physical dimensions
4. **Research Context**: Published studies on Talisay oil, comparison with other plant oils, potential industrial applications
5. **Philippine Distribution**: Where Talisay trees are found in the Philippines (coastal areas, named cities), cultural significance
6. **Machine Learning**: How AI/ML is used to analyze Talisay fruit images for oil yield prediction, color classification, and quality assessment

Key facts to reference:
- Kernel oil yield ranges from 38-65% depending on maturity and extraction method
- Green fruits are immature (lower oil yield ~45%), Brown fruits are overripe (higher oil yield ~53%)  
- The app uses YOLO object detection + CNN image classification for analysis
- Talisay City in Cebu and Talisay in Batangas are named after the tree
- The oil has potential as biodiesel, cosmetic, and pharmaceutical ingredient

Guidelines:
- Be friendly, informative, and scientifically accurate
- Reference specific studies when relevant (Thomson 2006, Janporn 2014, Santos et al. 2022, Arunachalam 2024)
- If asked about topics unrelated to Talisay or plant science, politely redirect but still be helpful
- Use Filipino cultural references when appropriate (e.g., "parang Talisay sa tabing-dagat")
- Keep responses concise but comprehensive (2-4 paragraphs max)
- Format with markdown where helpful (bold, bullet points)`;

let genAI = null;
let chatSession = null;

/**
 * Initialize the Gemini client
 */
function getClient() {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

/**
 * Get or create a chat session
 */
function getChatSession() {
  if (!chatSession) {
    const client = getClient();
    const model = client.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    });
    chatSession = model.startChat({
      history: [],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
    });
  }
  return chatSession;
}

/**
 * Send a message and get a response
 * @param {string} message - User's message
 * @returns {Promise<string>} - AI response text
 */
export async function sendMessage(message) {
  try {
    const session = getChatSession();
    const result = await session.sendMessage(message);
    const response = result.response;
    return response.text();
  } catch (error) {
    if (error.message === 'GEMINI_API_KEY_MISSING') {
      return '⚠️ **Gemini API key not configured.**\n\nTo use the AI chatbot, add your free Gemini API key:\n\n1. Go to [Google AI Studio](https://aistudio.google.com/apikey)\n2. Create a free API key\n3. Add `EXPO_PUBLIC_GEMINI_API_KEY=your_key_here` to your `.env` file\n4. Restart the app\n\nThe free tier includes 15 requests per minute — more than enough!';
    }
    console.error('[GeminiService] Error:', error.message);
    throw error;
  }
}

/**
 * Reset the chat session (start fresh conversation)
 */
export function resetChat() {
  chatSession = null;
}

/**
 * Check if the API key is configured
 */
export function isConfigured() {
  return !!GEMINI_API_KEY;
}

export const geminiService = {
  sendMessage,
  resetChat,
  isConfigured,
};
