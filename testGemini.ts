import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/tanliem/Desktop/meeting-main/.env.local" });

const run = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: 'Say hi'
  });
  console.log(JSON.stringify(response.usageMetadata, null, 2));
}
run();
