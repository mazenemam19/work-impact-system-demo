import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateRepo = (repoPath) => {
  if (!repoPath || typeof repoPath !== "string") {
    throw new Error("GitCollector: repoPath is required and must be a string");
  }
  if (!fs.existsSync(repoPath)) {
    throw new Error(`GitCollector: Repository path does not exist: ${repoPath}`);
  }
  const gitPath = path.join(repoPath, ".git");
  if (!fs.existsSync(gitPath)) {
    throw new Error(`GitCollector: Path is not a git repository: ${repoPath}`);
  }
};

const validateEmail = (authorEmail) => {
  if (!authorEmail || typeof authorEmail !== "string") {
    throw new Error("GitCollector: authorEmail is required and must be a string");
  }
  if (!emailRegex.test(authorEmail)) {
    throw new Error(`GitCollector: Invalid email format: ${authorEmail}`);
  }
};

const parseCommitBlock = (block, numstatBlocks) => {
  const lines = block.split("\n");
  if (lines.length < 3) {
    return null;
  }
  const hash = lines[0].trim();
  const dateStr = lines[1].trim();
  const subject = lines[2].trim();
  if (!hash || !/^[0-9a-f]{7,40}$/i.test(hash)) {
    return null;
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const bodyLines = lines.slice(3).filter((line) => line.trim());
  const fileChanges = [];
  if (numstatBlocks && numstatBlocks.length > 0) {
    for (const numstatBlock of numstatBlocks) {
      const line = numstatBlock.trim();
      const match = line.match(/^(-|\d+)\t(-|\d+)\t(.+)$/);
      if (match) {
        const [, addedStr, deletedStr, file] = match;
        const linesAdded = addedStr === "-" ? 0 : parseInt(addedStr, 10);
        const linesDeleted = deletedStr === "-" ? 0 : parseInt(deletedStr, 10);
        fileChanges.push({
          file,
          linesAdded: Number.isFinite(linesAdded) ? linesAdded : 0,
          linesDeleted: Number.isFinite(linesDeleted) ? linesDeleted : 0,
          isBinary: addedStr === "-" && deletedStr === "-",
        });
      }
    }
  }
  const totalAdded = fileChanges.reduce((sum, f) => sum + f.linesAdded, 0);
  const totalDeleted = fileChanges.reduce((sum, f) => sum + f.linesDeleted, 0);
  const isMerge = /^Merge (branch|pull request|remote-tracking branch)/i.test(subject);
  return {
    hash,
    date,
    subject,
    body: bodyLines.join("\n").trim(),
    filesChanged: fileChanges.length,
    linesAdded: totalAdded,
    linesDeleted: totalDeleted,
    files: fileChanges,
    isMerge,
  };
};

const parseGitLog = (logOutput) => {
  const commits = [];
  if (!logOutput || typeof logOutput !== "string") return commits;
  const blocks = logOutput.split("\0").filter(Boolean);
  let i = 0;
  while (i < blocks.length) {
    try {
      const block = blocks[i];
      if (/^[0-9a-f]{40}\n/.test(block)) {
        const numstatBlocks = [];
        i++;
        while (i < blocks.length && /^\n?-?\d+\t/.test(blocks[i])) {
          numstatBlocks.push(blocks[i]);
          i++;
        }
        const commit = parseCommitBlock(block, numstatBlocks);
        if (commit) {
          commits.push(commit);
        }
      } else {
        i++;
      }
    } catch (err) {
      if (process.env.DEBUG === "1") {
        console.warn(`⚠️  Failed to parse commit block: ${err.message}`);
      }
      i++;
    }
  }
  return commits;
};

const listFileTypes = (files = []) => {
  const types = files
    .map((file) => (file.file && file.file.includes(".") ? file.file.split(".").pop() : null))
    .filter(Boolean);
  return Array.from(new Set(types));
};

const scoreCommit = (commit) => {
  const added = Math.abs(commit.linesAdded || 0);
  const deleted = Math.abs(commit.linesDeleted || 0);
  const files = commit.filesChanged || 0;
  const churnScore = added + deleted;
  const fileWeight = files * 200;
  return churnScore + fileWeight;
};

export const createGitCollector = (repoPath, authorEmail) => {
  validateRepo(repoPath);
  validateEmail(authorEmail);

  const getRecentCommits = (options = {}) => {
    const { since, until, days } = options || {};
    const sinceDate = since
      ? since
      : new Date(Date.now() - (days || 30) * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const args = [
      "-C",
      repoPath,
      "log",
      "-z",
      `--author=${authorEmail}`,
      `--since=${sinceDate}`,
    ];
    if (until) {
        args.push(`--until=${until}`);
    }
    args.push("--format=%H%n%aI%n%s%n%b", "--numstat");
    const res = spawnSync("git", args, { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
    if (res.error) {
      throw new Error(`Failed to execute git command: ${res.error.message}`);
    }
    if (res.status !== 0) {
      const stderr = res.stderr || "Unknown error";
      throw new Error(`git log failed (exit code ${res.status}): ${stderr}`);
    }
    return parseGitLog(res.stdout);
  };

  const enrichCommits = (commits) =>
    commits.map((commit) => ({
      ...commit,
      fileTypes: listFileTypes(commit.files),
      score: scoreCommit(commit),
    }));

  return {
    getRecentCommits,
    enrichCommits,
  };
};
