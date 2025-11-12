#!/usr/bin/env node
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function setup() {
  console.log("🚀 Work Impact Analysis Setup\n");

  ["data", "reports"].forEach((dir) => {
    const dirPath = path.join(__dirname, "..", dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  });

  const config = {
    GIT_EMAIL: await ask("Your Git email: "),
    REPO_PATH: await ask("Repo path: "),
    GEMINI_API_KEY: await ask("Gemini API key (get from https://aistudio.google.com/app/apikey): "),
  };

  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  fs.writeFileSync(path.join(__dirname, "..", ".env"), envContent);

  const role = await ask("Your role (e.g., Senior Frontend Developer): ");
  const experience = await ask("Years of experience: ");
  const focus = await ask("Main tech stack (comma separated): ");
  const primaryProject = await ask("Primary project/product name: ");

  const profile = {
    role: role || "Frontend Developer",
    experience: experience || "4 years",
    focus: focus || "React, TypeScript",
    projects: [
      {
        name: primaryProject || "Project Name",
        description: "Describe the product or initiative (update me in data/profile.json).",
        users: "Who benefits from the work?",
        impact: "What business or user value does it unlock?",
        yourRole: `Summarize what you do on ${primaryProject || "this project"}.`,
        teamContext: {
          size: "Team composition (e.g., 2 FE, 3 BE, 1 PM)",
          yourPosition: "Where you sit within the team hierarchy",
          responsibilities: ["List 2-3 key responsibilities", "Call out any leadership or mentorship work"],
        },
      },
    ],
    techStack: {
      frontend: ["React", "TypeScript"],
      tools: ["Git", "GitHub", "ESLint"],
      architecture: ["Component-driven design", "API contract layering"],
      expertise: ["State management", "Code review", "Type safety"],
    },
    technicalChallenges: [
      "Describe the recurring technical challenge you are tackling",
      "Mention any architecture or quality hurdles",
    ],
    currentGoals: [
      {
        goal: "Example goal: Improve codebase maintainability",
        why: "Why does this goal matter to you or the team?",
        metrics: ["Metric or heuristic you track", "Another tangible indicator"],
        progress: "Quick note on how it's going",
      },
    ],
    personalContext: {
      careerStage: "Summarize your experience and aspirations",
      nextStep: "What title/role are you aiming for next?",
      motivations: ["What keeps you motivated?"],
      frustrations: ["What makes the current setup hard?"],
      proving: ["What proof points are you building toward?"],
    },
    marketContext: {
      location: "City / remote context",
      industry: "Current industry focus",
      lookingFor: "What kind of roles are you targeting?",
      targetCompanies: ["Company 1", "Company 2"],
    },
  };

  const dataDir = path.join(__dirname, "..", "data");
  fs.writeFileSync(path.join(dataDir, "profile.json"), JSON.stringify(profile, null, 2));

  const workPath = path.join(dataDir, "work.json");
  if (!fs.existsSync(workPath)) {
    const work = {
      collectedAt: new Date().toISOString(),
      period: { days: 30 },
      commits: [],
      summary: {
        totalCommits: 0,
        totalLinesAdded: 0,
        totalLinesDeleted: 0,
        totalLinesChanged: 0,
        filesChanged: 0,
      },
    };
    fs.writeFileSync(workPath, JSON.stringify(work, null, 2));
  }

  rl.close();

  console.log("\n✅ Setup complete!");
  console.log("\nNext steps:");
  console.log("1. Run: pnpm run collect");
  console.log("2. Run: pnpm run analyze\n");
}

setup();
