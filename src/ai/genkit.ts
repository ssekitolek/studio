
import {genkit, GenkitPlugin} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const plugins: GenkitPlugin[] = [];

if (process.env.NEXT_PUBLIC_GOOGLE_API_KEY) {
  plugins.push(googleAI());
} else {
  console.warn(
    `
💡 GradeCentral AI features are disabled. 
To enable them, set the NEXT_PUBLIC_GOOGLE_API_KEY in your .env file.
You can get a key from Google AI Studio: https://aistudio.google.com/app/apikey
`
  );
}

export const ai = genkit({
  plugins,
});
