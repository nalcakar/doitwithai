// whisperClient.js
import fs from 'fs';
import OpenAI from 'openai';
import { fileFromPath } from 'openai/uploads'; // ✅ Required for proper file formatting

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  try {
    const file = await fileFromPath(filePath); // ✅ ensures correct field structure
    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text', // optional: you can remove this line to use default
    });
    return response.text;
  } catch (err) {
    console.error("❌ Whisper transcription failed:", err);
    throw err;
  }
}
