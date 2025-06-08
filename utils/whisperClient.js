import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(filePath, originalName = 'audio.mp3') {
  try {
    const fileStream = fs.createReadStream(filePath);
    fileStream.path = filePath;
    fileStream.name = originalName; // ✅ Add this line to help OpenAI detect format

    console.log("🎧 Sending to OpenAI:", {
      fileName: originalName,
      filePath
    });

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-1'
    });

    return response.text;
 } catch (err) {
  console.error("❌ Transcription route error:", err);
  res.status(500).json({ error: err.message || 'Failed to transcribe audio.' });
}
}
