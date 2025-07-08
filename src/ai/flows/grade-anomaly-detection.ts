
'use server';

/**
 * @fileOverview Detects anomalies in grade submissions.
 *
 * - gradeAnomalyDetection - A function that triggers the grade anomaly detection flow.
 * - GradeAnomalyDetectionInput - The input type for the gradeAnomalyDetection function.
 * - GradeAnomalyDetectionOutput - The return type for the gradeAnomalyDetection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GradeEntrySchema = z.object({
  studentId: z.string().describe('Unique identifier for the student.'),
  grade: z.number().nullable().describe('The grade received by the student. A null value indicates that no grade was submitted.'),
});

const GradeAnomalyDetectionInputSchema = z.object({
  subject: z.string().describe('The subject for which grades are submitted.'),
  exam: z.string().describe('The exam for which grades are submitted.'),
  grades: z.array(GradeEntrySchema).describe('Array of grade entries for students.'),
  historicalAverage: z.number().optional().describe('The historical average grade for this subject and exam.'),
});

export type GradeAnomalyDetectionInput = z.infer<typeof GradeAnomalyDetectionInputSchema>;

const AnomalyExplanationSchema = z.object({
  studentId: z.string().describe('The student ID for the anomaly.'),
  explanation: z.string().describe('Explanation of the anomaly.'),
});

const GradeAnomalyDetectionOutputSchema = z.object({
  hasAnomalies: z.boolean().describe('Whether anomalies were detected in the grade submissions.'),
  anomalies: z.array(AnomalyExplanationSchema).describe('Explanations for each detected anomaly, if any.'),
});

export type GradeAnomalyDetectionOutput = z.infer<typeof GradeAnomalyDetectionOutputSchema>;

const isAiConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

let gradeAnomalyDetectionFlow: ((input: GradeAnomalyDetectionInput) => Promise<GradeAnomalyDetectionOutput>) | undefined;

// Only define the prompt and flow if the AI is configured. This prevents a server crash on startup.
if (isAiConfigured) {
  const gradeAnomalyDetectionPrompt = ai.definePrompt({
    name: 'gradeAnomalyDetectionPrompt',
    model: 'googleai/gemini-1.5-flash-latest', // Explicitly specify the model
    input: {schema: GradeAnomalyDetectionInputSchema},
    output: {schema: GradeAnomalyDetectionOutputSchema},
    prompt: `You are an expert AI assistant for a Director of Studies, specialized in reviewing student grade submissions to detect anomalies and ensure data integrity.

    You will be given the grades for a specific subject and exam. Your primary goal is to identify any results that seem unusual, incorrect, or worthy of a second look by a human.

    Analyze the provided data for the following types of anomalies:
    1.  **Uniform Scores:** Check if all students received the exact same grade. This is a strong anomaly indicator, especially if the class has more than 5 students.
    2.  **Statistical Outliers:**
        -   **Individual Scores:** Identify any student whose grade is a significant outlier compared to the rest of the class (e.g., more than 2.5 standard deviations from the class mean).
        -   **Deviation from History:** If a historical average is provided, flag the submission if the current class average deviates from it by a large margin (e.g., more than 15-20 percentage points).
    3.  **Missing Data:** Identify students with null or missing grades. A high percentage of missing grades for an assessment is a significant anomaly in itself.
    4.  **Unusual Distribution:** Look for strange patterns in grade distribution. For example, an unusual number of students scoring the maximum possible marks, the minimum possible marks (0), or clustering just above a common passing threshold (like 50%).

    Context:
    Subject: {{{subject}}}
    Exam: {{{exam}}}
    Grades: {{#each grades}}{{{studentId}}}: {{#if grade}}{{{grade}}}{{else}}NO_GRADE_SUBMITTED{{/if}}, {{/each}}
    {{#if historicalAverage}}Historical Average Score: {{{historicalAverage}}}{{/if}}

    Your response MUST be in the specified JSON format.
    - If you find any anomalies, set "hasAnomalies" to true and provide a clear, concise explanation for each anomaly in the "anomalies" array.
    - For anomalies affecting the whole class (like uniform scores or historical deviation), use "GENERAL" as the studentId.
    - For anomalies affecting specific students, use their studentId.
    - If no anomalies are found, "hasAnomalies" MUST be false and "anomalies" MUST be an empty array.
    `,
  });

  gradeAnomalyDetectionFlow = ai.defineFlow(
    {
      name: 'gradeAnomalyDetectionFlow',
      inputSchema: GradeAnomalyDetectionInputSchema,
      outputSchema: GradeAnomalyDetectionOutputSchema,
    },
    async input => {
      const {output} = await gradeAnomalyDetectionPrompt(input);
      // Ensure output is not null; if it is, return a default "no anomalies" response
      if (!output) {
        console.warn("Anomaly detection prompt returned null output. Defaulting to no anomalies.");
        return { hasAnomalies: false, anomalies: [] };
      }
      return output;
    }
  );
}

export async function gradeAnomalyDetection(input: GradeAnomalyDetectionInput): Promise<GradeAnomalyDetectionOutput> {
  if (!isAiConfigured || !gradeAnomalyDetectionFlow) {
    // Throw an error that the client-side component can catch and display in a toast.
    throw new Error("AI features are not configured. Please set NEXT_PUBLIC_GOOGLE_API_KEY in your .env file.");
  }
  return gradeAnomalyDetectionFlow(input);
}
