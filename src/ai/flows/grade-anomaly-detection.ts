
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
  grade: z.number().describe('The grade received by the student.'),
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

export async function gradeAnomalyDetection(input: GradeAnomalyDetectionInput): Promise<GradeAnomalyDetectionOutput> {
  return gradeAnomalyDetectionFlow(input);
}

const gradeAnomalyDetectionPrompt = ai.definePrompt({
  name: 'gradeAnomalyDetectionPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Explicitly specify the model
  input: {schema: GradeAnomalyDetectionInputSchema},
  output: {schema: GradeAnomalyDetectionOutputSchema},
  prompt: `You are an AI assistant specialized in detecting anomalies in student grades. 

  You will receive a list of student grades for a specific subject and exam. Your task is to identify any unusual patterns or anomalies in the grades, such as:

  - All students receiving the same grade if the class size is greater than 5.
  - Grades significantly deviating from the historical average (if provided, by more than 2 standard deviations or 20 percentage points).
  - Any individual grade being drastically different from the mean of the submitted grades for this specific assessment (e.g., more than 3 standard deviations if class size permits, or a large absolute difference).
  - Unusual clustering of grades at the pass/fail boundary or at maximum/minimum scores.
  - Any other unusual patterns that might indicate a data entry error or other irregularities.

  Subject: {{{subject}}}
  Exam: {{{exam}}}
  Grades: {{#each grades}}{{{studentId}}}: {{{grade}}}, {{/each}}
  {{#if historicalAverage}}Historical Average: {{{historicalAverage}}}{{/if}}
  
  Based on the provided information, determine if there are any anomalies in the grade submissions. If anomalies are detected, provide clear explanations for each anomaly, including the student ID and a description of the issue.

  Return your output in the following JSON format:
  {
    "hasAnomalies": true/false,
    "anomalies": [
      {
        "studentId": "student_id_or_general_observation_if_not_student_specific",
        "explanation": "Explanation of the anomaly"
      },
      ...
    ]
  }
  If no anomalies are found, "anomalies" should be an empty array and "hasAnomalies" should be false.
  If an anomaly is about a general pattern (e.g. all students same grade), use a placeholder like "GENERAL" for studentId.
  `,
});

const gradeAnomalyDetectionFlow = ai.defineFlow(
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
