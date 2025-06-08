import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  const fileStream = fs.createReadStream(filePath);

  const response = await openai.audio.transcriptions.create({
    file: {
      value: fileStream,
      options: {
        filename: path.basename(filePath),
        contentType: 'audio/mpeg' // or dynamically detect with mime if needed
      }
    },
    model: 'whisper-1',
  });

  return response.text;
}
