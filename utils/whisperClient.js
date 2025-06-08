import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath, originalName) {
  try {
    const buffer = await fs.readFile(filePath); // ✅ read buffer
    const extension = path.extname(originalName || filePath).toLowerCase();

    // Guess MIME type (OpenAI doesn't do this automatically)
    const mimeMap = {
      '.mp3': 'audio/mpeg',
      '.mpeg': 'audio/mpeg',
      '.mpga': 'audio/mpeg',
      '.m4a': 'audio/x-m4a',
      '.mp4': 'video/mp4',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.oga': 'audio/ogg',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    };

    const mimeType = mimeMap[extension];
    if (!mimeType) {
      throw new Error(`Unsupported extension: ${extension}`);
    }

    // Build actual File object
    const file = {
      name: originalName,
      type: mimeType,
      size: buffer.length,
      arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    };

    console.log("🎧 Sending file to OpenAI:", file.name, mimeType);

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    return response.text;

  } catch (err) {
    console.error("❌ Error during transcription:", err);
    throw new Error("Transcription failed. Please try a different file.");
  }
}
