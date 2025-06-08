import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  const fileBuffer = await fs.readFile(filePath);

  const response = await openai.audio.transcriptions.create({
    file: {
      name: path.basename(filePath),
      data: fileBuffer,
    },
    model: 'whisper-1',
  });

  return response.text;
}
