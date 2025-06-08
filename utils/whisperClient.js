import OpenAI from 'openai';
import { fileFromPath } from 'openai/uploads'; // ✅ Required for proper formatting

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  try {
    const file = await fileFromPath(filePath); // ✅ File with name and MIME type

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      // Optional:
      // language: 'tr',         // specify language if known
      // translate: true,        // translate to English
      // prompt: 'Proje özeti',  // helpful context
    });

    return response.text;

  } catch (error) {
    console.error("❌ Transcription error:", error);
    throw new Error("Transcription failed. Please try a different file.");
  }
}
