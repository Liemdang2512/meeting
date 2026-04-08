import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf-8");
const key = env.split("\n").find(line => line.startsWith("VITE_GEMINI_API_KEY")).split("=")[1];

const run = async () => {
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: 'Say hi'
  });
  console.log(JSON.stringify(response.usageMetadata, null, 2));
}
run();
