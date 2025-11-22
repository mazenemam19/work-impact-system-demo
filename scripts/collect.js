#!/usr/bin/env node
import dotenv from "dotenv";
import minimist from "minimist";
import { createGitCollector } from "../src/collectors/git-collector.js";
import { saveWork } from "../src/utils/storage.js";

dotenv.config();

const argv = minimist(process.argv.slice(2));

function scanArg(name) {
  const raw = process.argv.find((value) => value && value.startsWith(`--${name}=`));
  if (!raw) return undefined;
  const [, argValue] = raw.split("=");
  return argValue;
}

async function collect() {
  console.log("🔍 Collecting work data...\n");

  const days = argv.days || scanArg("days");
  const since = argv.since || scanArg("since");
  const until = argv.until || scanArg("until");

  if (since && until) {
    console.log(`🔍 Collecting work data from ${since} to ${until}...`);
  } else if (since) {
    console.log(`🔍 Collecting work data since ${since}...`);
  } else {
    console.log(`🔍 Collecting work data for last ${days || 30} days...`);
  }

  const repoPath = process.env.REPO_PATH
  const authorEmail = process.env.GIT_EMAIL;

  const collector = createGitCollector(repoPath, authorEmail);
  const commits = collector.getRecentCommits({ since, until, days });
  const enrichedCommits = collector.enrichCommits(commits);

  const totalLinesAdded = commits.reduce((sum, commit) => sum + (commit.linesAdded || 0), 0);
  const totalLinesDeleted = commits.reduce((sum, commit) => sum + (commit.linesDeleted || 0), 0);
  const totalLinesChanged = totalLinesAdded + totalLinesDeleted;
  const filesChanged = commits.reduce((sum, commit) => sum + (commit.filesChanged || 0), 0);

  console.log(`✅ Found ${commits.length} commits\n`);

  await saveWork({
    collectedAt: new Date().toISOString(),
    period: { days: days ? Number(days) : null, since: since || null, until: until || null },
    commits: enrichedCommits,
    summary: {
      totalCommits: commits.length,
      totalLinesAdded,
      totalLinesDeleted,
      totalLinesChanged,
      filesChanged,
    },
  });

  console.log("💾 Data saved to data/work.json\n");
}

collect().catch((error) => {
  console.error("❌ Failed to collect work data:", error.message || error);
  process.exitCode = 1;
});
