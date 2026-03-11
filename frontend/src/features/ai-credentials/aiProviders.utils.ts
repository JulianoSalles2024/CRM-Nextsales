import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-32-chars-!!";

export function encrypt(text: string) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (e) {
    safeError("Encryption error:", e);
    throw e;
  }
}

export function decrypt(text: string) {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    safeError("Decryption error:", e);
    return "DECRYPTION_ERROR";
  }
}

export async function testProviderConnection(provider: string, model: string, apiKey: string) {
  if (!apiKey) throw new Error("API Key is empty");

  if (provider === "gemini") {
    const genAI = new GoogleGenAI({ apiKey });
    await genAI.models.generateContent({
      model: model,
      contents: "hi",
    });
  } else if (provider === "openai") {
    const openai = new OpenAI({ apiKey });
    await openai.models.list();
  } else if (provider === "anthropic") {
    const anthropic = new Anthropic({ apiKey });
    await anthropic.messages.create({
      model: model,
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });
  }
}
