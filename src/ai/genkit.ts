
import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { firebaseConfig } from '@/lib/firebase';

const plugins: GenkitPlugin[] = [];

// Read the API key from the firebaseConfig object as requested.
const googleApiKey = firebaseConfig.NEXT_PUBLIC_GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

if (googleApiKey) {
  plugins.push(googleAI({apiKey: googleApiKey}));
} else {
  console.warn(
    `
💡 AI features are disabled. 
To enable them, set the NEXT_PUBLIC_GOOGLE_API_KEY in your .env file or firebaseConfig.
You can get a key from Google AI Studio: https://aistudio.google.com/app/apikey
`
  );
}

export const ai = genkit({
  plugins,
});
