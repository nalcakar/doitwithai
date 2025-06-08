import fs from 'fs';
import OpenAI from 'openai';
import { fileFromPath } from 'openai/uploads'; // ✅ This is required

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  const file = await fileFromPath(filePath); // ✅ Correct usage

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return response.text;
}
