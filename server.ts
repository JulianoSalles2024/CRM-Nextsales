import express from "express";
import fs from "fs";
import path from "path";

import credentialsHandler from "./api/ai/credentials";
import testConnectionHandler from "./api/ai/test-connection";
import generateHandler from "./api/ai/generate";
import migrateHandler from "./api/install/migrate";
import analyzeOpportunitiesHandler from "./api/opportunities/analyze";
import listOpportunitiesHandler from "./api/opportunities/list";
import channelsConnectHandler from "./api/channels/connect";
import channelsInstanceStateHandler from "./api/channels/instance-state";
import channelsRegisterHandler from "./api/channels/register";
import channelsHealthHandler from "./api/channels/health";
import channelsSendHandler from "./api/channels/send";
import apiKeysHandler from "./api/api-keys/index";

const app = express();
const PORT = 3000;

app.use(express.json());

const CREDENTIALS_DIR = path.resolve(process.cwd(), "credentials");
if (!fs.existsSync(CREDENTIALS_DIR)) {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
}

// --- API ROUTES ---

app.all("/api/ai/credentials", (req, res) => credentialsHandler(req as any, res as any));
app.all("/api/ai/test-connection", (req, res) => testConnectionHandler(req, res));
app.all("/api/ai/generate", (req, res) => generateHandler(req, res));
app.all("/api/install/migrate", (req, res) => migrateHandler(req as any, res as any));
app.post("/api/opportunities/analyze", (req, res) => analyzeOpportunitiesHandler(req as any, res as any));
app.get("/api/opportunities/list", (req, res) => listOpportunitiesHandler(req as any, res as any));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.post("/api/channels/connect", (req, res) => channelsConnectHandler(req as any, res as any));
app.get("/api/channels/instance-state", (req, res) => channelsInstanceStateHandler(req as any, res as any));
app.post("/api/channels/register", (req, res) => channelsRegisterHandler(req as any, res as any));
app.all("/api/channels/health", (req, res) => channelsHealthHandler(req as any, res as any));
app.post("/api/channels/send", (req, res) => channelsSendHandler(req as any, res as any));
app.all("/api/api-keys", (req, res) => apiKeysHandler(req as any, res as any));

// Production: serve frontend estático
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
