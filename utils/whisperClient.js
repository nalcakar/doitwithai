import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath, originalName = 'audio.mp3') {
  try {
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(originalName); // <- MUST end with .mp3 or supported extension

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      fileName, // ✅ Required to help detect format
      model: 'whisper-1',
    });

    return response.text;

  } catch (err) {
    console.error("❌ Transcription error:", err);
    throw new Error("Transcription failed.");
  }
}
