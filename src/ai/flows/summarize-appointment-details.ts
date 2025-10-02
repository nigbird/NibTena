'use server';
/**
 * @fileOverview An AI agent that summarizes patient symptoms and concerns for doctor's appointment.
 *
 * - summarizeAppointmentDetails - A function that handles the summarization process.
 * - SummarizeAppointmentDetailsInput - The input type for the summarizeAppointmentDetails function.
 * - SummarizeAppointmentDetailsOutput - The return type for the summarizeAppointmentDetails function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeAppointmentDetailsInputSchema = z.object({
  symptoms: z.string().describe('A detailed description of the patient\'s symptoms and concerns.'),
});
export type SummarizeAppointmentDetailsInput = z.infer<typeof SummarizeAppointmentDetailsInputSchema>;

const SummarizeAppointmentDetailsOutputSchema = z.object({
  summary: z.string().describe('A well-structured summary of the patient\'s symptoms and concerns for the doctor.'),
});
export type SummarizeAppointmentDetailsOutput = z.infer<typeof SummarizeAppointmentDetailsOutputSchema>;

export async function summarizeAppointmentDetails(input: SummarizeAppointmentDetailsInput): Promise<SummarizeAppointmentDetailsOutput> {
  return summarizeAppointmentDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeAppointmentDetailsPrompt',
  input: {schema: SummarizeAppointmentDetailsInputSchema},
  output: {schema: SummarizeAppointmentDetailsOutputSchema},
  prompt: `You are an AI assistant that helps summarize patient symptoms and concerns for doctors.\n\nGiven the following description of symptoms and concerns, create a well-structured summary that will help the doctor quickly understand the main issue and prepare for the consultation.\n\nSymptoms and Concerns: {{{symptoms}}}\n\nSummary: `,
});

const summarizeAppointmentDetailsFlow = ai.defineFlow(
  {
    name: 'summarizeAppointmentDetailsFlow',
    inputSchema: SummarizeAppointmentDetailsInputSchema,
    outputSchema: SummarizeAppointmentDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
