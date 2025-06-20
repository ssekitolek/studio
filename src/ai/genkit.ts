
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check if the API key is present in the environment.
// Note: In a production environment, prefer using GOOGLE_API_KEY which is not exposed to the client.
const hasApiKey = !!process.env.GOOGLE_API_KEY || !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (!hasApiKey) {
    console.warn("CRITICAL_WARNING: GOOGLE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY is not set in the environment variables. Genkit's Google AI features will be disabled. The server will start, but any calls to AI flows will fail. To enable, please set the key in your .env file.");
}

export const ai = genkit({
  // Only include the googleAI plugin if the API key is available.
  // This prevents the server from crashing on startup if the key is missing.
  plugins: hasApiKey ? [googleAI()] : [],
});
