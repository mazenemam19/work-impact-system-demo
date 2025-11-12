export function buildImpactAnalysisPrompt(workData, userProfile) {
  const commits = Array.isArray(workData?.commits) ? workData.commits.slice() : [];
  const summary = workData?.summary || {};
  const period = workData?.period || {};

  commits.sort((a, b) => {
    const scoreA = typeof a.score === "number" ? a.score : 0;
    const scoreB = typeof b.score === "number" ? b.score : 0;
    return scoreB - scoreA;
  });

  const TOP_N = 20;
  const topCommits = commits.slice(0, TOP_N);
  const omittedCount = Math.max(commits.length - topCommits.length, 0);

  const averageLines = commits.length ? Math.round((summary.totalLinesChanged || 0) / commits.length) : 0;
  const averageFiles = commits.length ? Number((summary.filesChanged || 0) / commits.length).toFixed(1) : "0.0";

  const formatDate = (value) => {
    if (!value) return "Unknown";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().split("T")[0];
  };

  const formatFileTypes = (commit) => {
    if (!commit.fileTypes || !commit.fileTypes.length) return "n/a";
    return commit.fileTypes.join(", ");
  };

  const clipBody = (body) => {
    if (!body) return "";
    return body.length > 400 ? `${body.slice(0, 400)}...` : body;
  };

  const periodLabel = (() => {
    if (period.since) return `Since ${period.since}`;
    if (period.days) return `Last ${period.days} days`;
    return "Custom range";
  })();

  const profileSection = userProfile
    ? JSON.stringify(userProfile, null, 2)
    : '{\n  "note": "profile.json not configured; update data/profile.json for richer context"\n}';

  const topCommitSection = topCommits
    .map((commit, index) => {
      return `### ${index + 1}. ${commit.subject || "(no subject)"}

- Hash: ${commit.hash}
- Date: ${formatDate(commit.date)}
- Lines: +${commit.linesAdded || 0} / -${commit.linesDeleted || 0}
- Files Changed: ${commit.filesChanged || 0}
- File Types: ${formatFileTypes(commit)}
- Merge Commit: ${commit.isMerge ? "yes" : "no"}

${clipBody(commit.body)}`;
    })
    .join("\n\n---\n\n");

  return `# Developer Impact Analysis

## Developer Profile
${profileSection}

## Work Snapshot
- **Period**: ${periodLabel}
- **Total Commits**: ${summary.totalCommits || commits.length || 0}
- **Lines Added**: ${summary.totalLinesAdded || 0}
- **Lines Deleted**: ${summary.totalLinesDeleted || 0}
- **Lines Changed**: ${summary.totalLinesChanged || 0}
- **Files Touched**: ${summary.filesChanged || 0}
- **Average Lines per Commit**: ${averageLines}
- **Average Files per Commit**: ${averageFiles}

---

## Top ${topCommits.length} Commits By Impact Score
${topCommitSection}
${
  omittedCount
    ? `
*Note: ${omittedCount} additional commits omitted for brevity.*
`
    : ""
}

---

## Your Task
You are an experienced engineering manager. Use only the evidence provided (commits, profile, summary stats). Do not invent ticket numbers, external approvals, or productivity metrics that are not explicitly supplied. Base every claim on the observable data.

## Required Analysis

### 0. Highlights & Milestones
Write 3-5 bullets capturing the standout work, referencing facts above (e.g., scope, cadence, measurable impact).

### 1. Executive Summary
2-3 sentences describing the overall impact and themes.

### 2. Key Achievements
List 3-5 accomplishments. For each: what changed, why it matters, observable effort metrics (lines/files/commit counts), and skills demonstrated. Tie statements to specific commits when possible.

### 3. Delivery Patterns
Discuss cadence, workload mix, and any notable swings. Use the provided totals/averages and commit-level evidence.

### 4. Skills Demonstrated
Enumerate technical and collaboration skills that can be defended with the commit evidence.

### 5. Growth Indicators
Explain strengths, areas of momentum, and readiness for broader scope using only grounded observations.

### 6. Performance Review Talking Points
Provide 3-5 bullet points framed for a performance review. Anchor each to measurable outcomes.

### 7. "Should I Feel Proud?" Assessment
Categorize the period (Below Average / Average / Above Average / Exceptional) with justification derived from the data.

### 8. Emotional Validation
Write 4-6 sentences acknowledging effort and impact. Keep the tone sincere and evidence-based.

### 9. Opportunities & Next Steps
Offer 4-5 six-month recommendations that a senior developer could pursue. Each item must:
- Start with the skill or signal being strengthened.
- Cite the relevant commit evidence.
- Outline concrete actions and checkpoints.
- Define success metrics or artifacts to collect.

### CV Highlights (copy-paste ready)
Generate 6 resume bullets written for a senior-level engineer. Each bullet should:
- Read like a high-level accomplishment, not a task log.
- Emphasize strategic leadership, technical authority, and cross-team or organizational reach.
- Focus on meaningful business or user outcomes (reliability gains, customer impact, risk reduction) rather than code volume.
- Showcase ownership of direction, standards, and collaboration that moved the company forward.
- Never mention line counts, file counts, commit totals, or ticket IDs. If quantitative evidence exists, use business-facing metrics (e.g., user reach, latency improvements); otherwise, describe the impact qualitatively.
- Spotlight how the work advanced product strategy, enabled partner success, or hardened operational resilience; keep the framing senior-level and forward-looking.
Keep the tone concise, confident, and outcome-oriented.

## Output Rules
Return a single markdown document following the section order above. Do not wrap the response in additional fences or commentary. Base every insight on the provided data; flag assumptions if you must make any.
`;
}
