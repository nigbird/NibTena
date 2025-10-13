'use server';
/**
 * @fileOverview An AI flow to summarize patient symptoms for doctors.
 *
 * - summarizeSymptoms - A function that takes patient symptoms and generates a concise summary.
 * - SummarizeSymptomsInput - The input type for the summarizeSymptoms function.
 * - SummarizeSymptomsOutput - The return type for the summarizeSymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSymptomsInputSchema = z.object({
  symptoms: z.string().describe("The patient's description of their symptoms and concerns."),
});
export type SummarizeSymptomsInput = z.infer<typeof SummarizeSymptomsInputSchema>;

const SummarizeSymptomsOutputSchema = z.object({
  summary: z.string().describe("A concise, well-structured summary of the patient's main issue for the doctor."),
});
export type SummarizeSymptomsOutput = z.infer<typeof SummarizeSymptomsOutputSchema>;

export async function summarizeSymptoms(input: SummarizeSymptomsInput): Promise<SummarizeSymptomsOutput> {
  return summarizeSymptomsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSymptomsPrompt',
  input: {schema: SummarizeSymptomsInputSchema},
  output: {schema: SummarizeSymptomsOutputSchema},
  prompt: `You are an expert medical assistant. Your task is to read the patient's reported symptoms and generate a concise, one or two-sentence summary for the doctor. This summary should highlight the main complaint and its duration or key characteristics if provided.

Patient's Symptoms:
"{{{symptoms}}}"

Generate a clear and brief summary that a doctor can read quickly before an appointment.
Focus on the primary medical issue.
`,
});

const summarizeSymptomsFlow = ai.defineFlow(
  {
    name: 'summarizeSymptomsFlow',
    inputSchema: SummarizeSymptomsInputSchema,
    outputSchema: SummarizeSymptomsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
