# Work Impact Analysis

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure the environment**

   ```bash
   cp .env.example .env
   ```

   Required variables:

   - `REPO_PATH` — absolute path to the repo you want to analyze.
   - `GIT_EMAIL` — commits will be filtered by this author email.
   - `GEMINI_API_KEY` — Google Generative AI key.

   Optional: `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).

3. **Seed profile data**

   ```bash
   pnpm run setup
   ```

   The setup script creates `.env` (if missing), scaffolds `data/profile.json`, and prepares an empty `data/work.json`.

4. **Collect and analyze**

   ```bash
   pnpm run collect -- --days=7          # writes data/work.json
   pnpm run analyze                      # writes reports/<timestamp>-impact.md (ISO-ish)
   ```

   Use `--since=YYYY-MM-DD` if you prefer an explicit starting point.

## Available Scripts

| Command                     | Purpose                                                                             |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm run setup`            | Interactive bootstrap for `.env`, `data/profile.json`, and `data/work.json`.        |
| `node scripts/init-data.js` | Non-interactive placeholder generator for profile/work JSON files.                  |
| `pnpm run collect`          | Parse git commits for the configured author and save `data/work.json`.              |
| `pnpm run analyze`          | Call Gemini with the simplified prompt and produce `reports/<timestamp>-impact.md`. |
| `pnpm run list-models`      | Enumerate available Gemini models (requires `GEMINI_API_KEY`).                      |

## Data Outputs

- `data/profile.json` — personal context referenced by the prompt.
- `data/work.json` — deterministic summary of recent commits.
- `reports/<timestamp>-impact.md` — narrative produced by Gemini for the reporting window.

That’s it—skills exports, dashboards, and job-readiness reports have been removed from this codebase.

## Troubleshooting

- **No report produced** → ensure `pnpm run collect` completed and `data/work.json` exists.
- **Empty profile warning in the report** → edit `data/profile.json` with your background and goals.
- **Gemini errors** → confirm `GEMINI_API_KEY` is set and valid. Set `GEMINI_MODEL` if you need a different model.
- **Nothing collected** → double-check `REPO_PATH` and `GIT_EMAIL`; only commits authored by that email are included.
