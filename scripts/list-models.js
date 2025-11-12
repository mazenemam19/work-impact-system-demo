#!/usr/bin/env node
import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

const collectedModels = [];

async function detectAndListModels() {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    if (!client) return false;

    if (client.models && typeof client.models.list === "function") {
      const res = client.models.list();
      if (res && typeof res[Symbol.asyncIterator] === "function") {
        for await (const m of res) printModelEntry(m);
        return true;
      }
      const awaited = await res;
      normalizeAndPrint(awaited);
      return true;
    }
  } catch (e) {
    console.error("Failed to load @google/genai:", e && e.message ? e.message : e);
  }
  return false;
}

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not set in .env");
    process.exit(1);
  }

  if (await detectAndListModels()) return;

  console.error(
    "Could not list models with installed SDKs. Check which @google genai package is installed and consult its docs."
  );
  console.error("Recommended: install @google/genai and use its Models.list() async iterator (see Google GenAI docs).");
  process.exit(1);
}

async function runAndSave() {
  await listModels();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const outPath = path.join(DATA_DIR, "models.json");
    await fs.writeFile(outPath, JSON.stringify(collectedModels, null, 2), "utf-8");
    console.log("\nSaved normalized model list to", outPath);
  } catch (err) {
    console.error("Failed to save models.json:", err && err.message ? err.message : err);
  }
}

runAndSave();

function printModelEntry(m) {
  if (!m) return;
  const name =
    m.name || m.model || m.id || (m.displayName && m.displayName.toLowerCase()) || JSON.stringify(m).slice(0, 80);
  const display = m.displayName || m.description || "";
  const limits = getRateLimitsForModel(m);
  const limitsStr = limits ? ` [RPM:${limits.rpm} TPM:${limits.tpm} RPD:${limits.rpd}]` : "";
  console.log(`${name}${display ? " — " + display : ""}${limitsStr}`);
  collectedModels.push({ name, displayName: display, limits: limits || null, raw: m });
}

function normalizeAndPrint(result) {
  if (!result) return;
  if (Array.isArray(result)) return result.forEach(printModelEntry);
  if (result.models && Array.isArray(result.models)) return result.models.forEach(printModelEntry);
  if (result.pageInternal && Array.isArray(result.pageInternal)) return result.pageInternal.forEach(printModelEntry);
  for (const k of Object.keys(result)) {
    if (Array.isArray(result[k])) return result[k].forEach(printModelEntry);
  }
  console.log(JSON.stringify(result).slice(0, 200));
}

function getRateLimitsForModel(m) {
  const name = (m.name || m.model || m.displayName || "").toLowerCase();
  const table = [
    { match: "gemini 2.5 pro", rpm: 2, tpm: 125000, rpd: 50 },
    { match: "gemini-2.5-pro", rpm: 2, tpm: 125000, rpd: 50 },
    { match: "gemini 2.5 flash", rpm: 10, tpm: 250000, rpd: 250 },
    { match: "gemini-2.5-flash", rpm: 10, tpm: 250000, rpd: 250 },
    { match: "gemini 2.5 flash preview", rpm: 10, tpm: 250000, rpd: 250 },
    { match: "gemini 2.5 flash-lite", rpm: 15, tpm: 250000, rpd: 1000 },
    { match: "gemini 2.5 flash-lite preview", rpm: 15, tpm: 250000, rpd: 1000 },
    { match: "gemini 2.0 flash", rpm: 15, tpm: 1000000, rpd: 200 },
    { match: "gemini 2.0 flash-lite", rpm: 30, tpm: 1000000, rpd: 200 },
    { match: "gemini 2.5 flash live", rpm: null, tpm: 1000000, rpd: null },
    { match: "gemini 2.5 flash preview native audio", rpm: null, tpm: 500000, rpd: null },
    { match: "gemini 2.0 flash live", rpm: null, tpm: 1000000, rpd: null },
    { match: "gemini 2.5 flash preview tts", rpm: 3, tpm: 10000, rpd: 15 },
    { match: "gemini 2.0 flash preview image generation", rpm: 10, tpm: 200000, rpd: 100 },
    { match: "gemma 3", rpm: 30, tpm: 15000, rpd: 14400 },
    { match: "gemma 3n", rpm: 30, tpm: 15000, rpd: 14400 },
    { match: "gemini embedding", rpm: 100, tpm: 30000, rpd: 1000 },
    { match: "gemini robotics-er 1.5 preview", rpm: 10, tpm: 250000, rpd: 250 },
    { match: "gemini 1.5 flash", rpm: 15, tpm: 250000, rpd: 50 },
    { match: "gemini 1.5 flash-8b", rpm: 15, tpm: 250000, rpd: 50 },
  ];

  for (const row of table) {
    if (name.includes(row.match)) return { rpm: row.rpm, tpm: row.tpm, rpd: row.rpd };
  }
  const actions = (m.supportedActions || []).join(" ").toLowerCase();
  if (actions.includes("embed")) return { rpm: 100, tpm: 30000, rpd: 1000 };
  return null;
}
