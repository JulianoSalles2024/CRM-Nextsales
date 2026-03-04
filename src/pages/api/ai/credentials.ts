import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "../../../features/ai-credentials/aiProviders.utils";

const CREDENTIALS_DIR = path.resolve(process.cwd(), "credentials");

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const { organizationId } = req.query;
    if (!organizationId) return res.status(400).json({ error: "organizationId is required" });

    const orgDir = path.join(CREDENTIALS_DIR, organizationId as string);
    if (!fs.existsSync(orgDir)) return res.json({});

    const credentials: any = {};
    try {
      const files = fs.readdirSync(orgDir);
      files.forEach(file => {
        if (file.endsWith(".json")) {
          const provider = file.replace(".json", "");
          const data = JSON.parse(fs.readFileSync(path.join(orgDir, file), "utf-8"));
          credentials[provider] = {
            provider,
            model: data.model,
            status: data.status || "connected",
            apiKey: "********", 
          };
        }
      });
      return res.json(credentials);
    } catch (e) {
      return res.status(500).json({ error: "Failed to read credentials" });
    }
  }

  if (req.method === 'POST') {
    const { organizationId, provider, apiKey, model } = req.body;
    if (!organizationId || !provider || !apiKey || !model) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const orgDir = path.join(CREDENTIALS_DIR, organizationId);
    if (!fs.existsSync(orgDir)) fs.mkdirSync(orgDir, { recursive: true });

    const filePath = path.join(orgDir, `${provider}.json`);
    
    let finalKey = apiKey;
    if (apiKey === "********" && fs.existsSync(filePath)) {
      const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      finalKey = decrypt(existing.encryptedKey);
    }

    const credentialData = {
      provider,
      model,
      encryptedKey: encrypt(finalKey),
      createdAt: new Date().toISOString(),
      status: "connected"
    };

    fs.writeFileSync(filePath, JSON.stringify(credentialData, null, 2));
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
