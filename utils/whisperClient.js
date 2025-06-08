import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error("File does not exist.");
    }

    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);

    console.log("🎧 Sending file to OpenAI:", fileName);

    const response = await openai.audio.transcriptions.create({
      file: fileStream,
      fileName, // ✅ Required for file format detection
      model: 'whisper-1',
      response_format: 'json'
    });

    console.log("✅ Transcription received.");
    return response.text;

  } catch (error) {
    console.error("❌ Error during transcription:", error);

    // Better debug info if it's an OpenAI response
    if (error.response) {
      console.error("OpenAI error response:", await error.response.json?.());
    }

    throw new Error("Transcription failed. Please try a different file.");
  }
}
