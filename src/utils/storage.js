import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");

export const saveWork = async (data) => {
  try {
    await fs.writeFile(path.join(DATA_DIR, "work.json"), JSON.stringify(data, null, 2));
  } catch (err) {
    throw new Error(`Failed to save work.json: ${err.message}`);
  }
};

export const loadWork = async () => {
  const filePath = path.join(DATA_DIR, "work.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn("⚠️  work.json not found. Run: pnpm run collect");
      return null;
    }
    if (err instanceof SyntaxError) {
      throw new Error(`work.json is corrupted (invalid JSON): ${err.message}`);
    }
    throw new Error(`Failed to load work.json: ${err.message}`);
  }
};

export const loadProfile = async () => {
  const filePath = path.join(DATA_DIR, "profile.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.warn("⚠️  profile.json not found. Run: pnpm run setup");
      return null;
    }
    if (err instanceof SyntaxError) {
      throw new Error(`profile.json is corrupted (invalid JSON): ${err.message}`);
    }
    throw new Error(`Failed to load profile.json: ${err.message}`);
  }
};
