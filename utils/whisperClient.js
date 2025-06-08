import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(filePath, originalName) {
  const fileStream = fs.createReadStream(filePath);

  // 🛠️ Fix: Use a "File-like" object with a name
  const fileForWhisper = {
    name: originalName || 'audio.mp3',
    stream: fileStream
  };

  const response = await openai.audio.transcriptions.create({
    file: fileForWhisper,
    model: 'whisper-1',
  });

  return response.text;
}
