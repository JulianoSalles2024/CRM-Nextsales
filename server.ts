import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

import credentialsHandler from "./api/ai/credentials";
import testConnectionHandler from "./api/ai/test-connection";
import generateHandler from "./src/pages/api/ai/generate";
import migrateHandler from "./api/install/migrate";

const app = express();
const PORT = 3000;

// Middleware para logs de requisição - ajuda a debugar 404s
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

const CREDENTIALS_DIR = path.resolve(process.cwd(), "credentials");
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-32-chars-!!"; 

// Garantir diretório de credenciais
if (!fs.existsSync(CREDENTIALS_DIR)) {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
}

// --- API ROUTES ---

app.all("/api/ai/credentials", (req, res) => credentialsHandler(req as any, res as any));
app.all("/api/ai/test-connection", (req, res) => testConnectionHandler(req, res));
app.all("/api/ai/generate", (req, res) => generateHandler(req, res));
app.all("/api/install/migrate", (req, res) => migrateHandler(req as any, res as any));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// --- VITE MIDDLEWARE / STATIC SERVING ---
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});
