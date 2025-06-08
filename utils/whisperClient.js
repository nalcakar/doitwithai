import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(filePath, originalName) {
  const stream = fs.createReadStream(filePath);
  const filename = path.basename(originalName); // e.g. "fsm.mp3"

  const resp = await openai.audio.transcriptions.create({
    file: {
      name: filename,
      stream: stream,
    },
    model: 'whisper-1',
  });

  return resp.text;
}
