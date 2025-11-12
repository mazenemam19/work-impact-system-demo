#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const profilePath = path.join(DATA_DIR, "profile.json");
const workPath = path.join(DATA_DIR, "work.json");

if (!fs.existsSync(profilePath)) {
  const profile = {
    role: "Frontend Developer",
    experience: "4 years",
    focus: "React, TypeScript, Frontend Architecture",
    projects: [
      {
        name: "Project Name",
        description: "Describe the product or initiative.",
        users: "Who benefits from the work?",
        impact: "What business or user value does it unlock?",
        yourRole: "Summarize what you do on this project.",
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
        why: "Why does this goal matter?",
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
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf-8");
  console.log("Created data/profile.json (fill in real details before analyzing)");
} else {
  console.log("data/profile.json already exists");
}

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
  fs.writeFileSync(workPath, JSON.stringify(work, null, 2), "utf-8");
  console.log("Created data/work.json (populate via `pnpm run collect`)");
} else {
  console.log("data/work.json already exists");
}

console.log("Init complete");
