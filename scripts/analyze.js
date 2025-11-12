#!/usr/bin/env node
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createImpactAnalyzer } from "../src/analyzers/impact-analyzer.js";
import { loadProfile, loadWork } from "../src/utils/storage.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyze() {
  console.log("📊 Starting impact analysis...\n");
  console.log(
    "⌛ Gemini responses arrive in one chunk — no ETA available. Keep this window open; you'll see progress updates while we wait.\n"
  );

  const workData = await loadWork();
  if (!workData) {
    console.error("❌ No work data found. Run collect.js first.");
    process.exit(1);
  }

  const profile = await loadProfile();
  const analyzer = createImpactAnalyzer(process.env.GEMINI_API_KEY);

  const startTime = Date.now();
  let progressInterval = null;
  const startProgress = () => {
    progressInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r🤖 Still working... ${elapsed}s elapsed (waiting on Gemini response — no ETA)`);
    }, 2000);
  };

  const stopProgress = () => {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
      const totalSeconds = Math.round((Date.now() - startTime) / 1000);
      process.stdout.write(`\r🤖 LLM completed in ${totalSeconds}s\n`);
    }
  };

  startProgress();
  let insights;
  try {
    insights = await analyzer.analyzeWork(workData, profile);
  } finally {
    stopProgress();
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:]/g, "-").split(".")[0];
  const reportFileName = `${timestamp}-impact.md`;
  const reportPath = path.join(__dirname, "../reports", reportFileName);

  const reportsDir = path.join(__dirname, "../reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, insights.analysis, "utf-8");

  console.log(`\n✅ Analysis complete!`);
  console.log(`📄 Report saved to: ${reportPath}\n`);
}

analyze().catch(console.error);
