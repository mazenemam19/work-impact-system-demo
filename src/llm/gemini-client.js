import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
  BACKOFF_MULTIPLIER: 2,
  RETRYABLE_STATUS_CODES: [429, 500, 502, 503, 504],
};

function createGeminiClient(apiKey) {
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("GeminiClient: apiKey is required and must be a string");
  }
  if (apiKey.length < 20) {
    throw new Error("GeminiClient: apiKey appears to be invalid (too short)");
  }

  const apiKeyRedacted = `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`;

  if (!GoogleGenAI) {
    throw new Error("No supported Google GenAI SDK found. Install @google/genai");
  }

  const client = new GoogleGenAI({ apiKey });

  let modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  let resolvedModelName = null;
  const defaultMaxOutputTokens = process.env.GEMINI_MAX_OUTPUT_TOKENS
    ? parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS, 10)
    : 8192;

  async function analyze(prompt) {
    return retryWithBackoff(() => _analyzeInternal(prompt));
  }

  async function _analyzeInternal(prompt) {
    try {
      const modelToUse = await resolveModelName();

      if (client && client.models && typeof client.models.generateContent === "function") {
        try {
          let maxOutputTokens = await getModelMaxOutputTokens(modelToUse).catch(() => null);
          if (!maxOutputTokens) maxOutputTokens = defaultMaxOutputTokens;
          maxOutputTokens = Math.max(256, Math.min(65536, Number(maxOutputTokens) || defaultMaxOutputTokens));

          const response = await client.models.generateContent({
            model: modelToUse,
            contents: prompt,
            maxOutputTokens,
            max_output_tokens: maxOutputTokens,
          });
          return (
            response &&
            (response.text || (response.candidates && response.candidates[0] && response.candidates[0].content) || "")
          );
        } catch (err) {
          if (err && err.status === 404) {
            console.warn(`Model ${modelToUse} not supported; retrying with fallback models/gemini-2.5-flash`);
            resolvedModelName = "models/gemini-2.5-flash";
            const response2 = await client.models.generateContent({
              model: resolvedModelName,
              contents: prompt,
            });
            return (
              response2 &&
              (response2.text ||
                (response2.candidates && response2.candidates[0] && response2.candidates[0].content) ||
                "")
            );
          }
          throw err;
        }
      }

      throw new Error("Unsupported Generative AI SDK surface: cannot find models.generateContent");
    } catch (err) {
      if (err && err.status === 404) {
        console.error(
          `LLM Error (404): model '${modelName}' not found for this SDK/API. Check GEMINI_MODEL and API version.`
        );
      }
      console.error("LLM Error:", err);
      throw err;
    }
  }

  async function retryWithBackoff(fn) {
    let lastError;
    let delay = RETRY_CONFIG.INITIAL_DELAY_MS;

    for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;

        const statusCode = err?.status || err?.statusCode;
        const isRetryable = RETRY_CONFIG.RETRYABLE_STATUS_CODES.includes(statusCode);

        const isNetworkError = err?.code === "ECONNRESET" || err?.code === "ETIMEDOUT" || err?.code === "ENOTFOUND";

        if (!isRetryable && !isNetworkError) {
          throw err;
        }

        if (attempt >= RETRY_CONFIG.MAX_RETRIES) {
          console.error(
            `❌ LLM request failed after ${RETRY_CONFIG.MAX_RETRIES + 1} attempts (API Key: ${apiKeyRedacted})`
          );
          throw err;
        }

        console.warn(
          `⚠️  LLM request failed (attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES + 1}): ${
            err.message
          }. Retrying in ${delay}ms...`
        );

        await sleep(delay);

        delay = Math.min(delay * RETRY_CONFIG.BACKOFF_MULTIPLIER, RETRY_CONFIG.MAX_DELAY_MS);
      }
    }

    throw lastError;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function getModelMaxOutputTokens(modelNameParam) {
    if (!modelNameParam) return null;
    const requested = (modelNameParam || "").toLowerCase();
    try {
      const modelsPath = path.join(process.cwd(), "data", "models.json");
      if (fs.existsSync(modelsPath)) {
        const raw = fs.readFileSync(modelsPath, "utf8");
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed.models || parsed;
        for (const m of list) {
          const id = (m.name || m.id || m.model || "").toLowerCase();
          if (id.includes(requested)) {
            const possible =
              m.maxOutputTokens ||
              m.max_output_tokens ||
              m.contextSize ||
              m.context_size ||
              m.context_length ||
              m.context ||
              (m.limits && (m.limits.tpm || m.limits.rpm)) ||
              m.context_window;
            if (possible) return Number(possible);
          }
        }
      }
    } catch {}

    try {
      if (client && client.models && typeof client.models.list === "function") {
        const result = client.models.list();
        if (result && typeof result[Symbol.asyncIterator] === "function") {
          for await (const m of result) {
            const id = (m.name || m.id || "").toLowerCase();
            if (id.includes(requested)) {
              const possible =
                m.maxOutputTokens ||
                m.max_output_tokens ||
                m.contextSize ||
                m.context_size ||
                m.context_length ||
                m.context;
              if (possible) return Number(possible);
            }
          }
        } else {
          const awaited = await result;
          const list = (awaited && (awaited.models || awaited.model || awaited)) || [];
          for (const m of list) {
            const id = (m.name || m.id || "").toLowerCase();
            if (id.includes(requested)) {
              const possible =
                m.maxOutputTokens ||
                m.max_output_tokens ||
                m.contextSize ||
                m.context_size ||
                m.context_length ||
                m.context;
              if (possible) return Number(possible);
            }
          }
        }
      }
    } catch {}

    return null;
  }

  async function resolveModelName() {
    if (resolvedModelName) return resolvedModelName;
    const requested = (modelName || "").toLowerCase();
    if (!requested) return requested;

    if (requested.startsWith("models/")) {
      resolvedModelName = modelName;
      return resolvedModelName;
    }

    try {
      try {
        const modelsPath = path.join(process.cwd(), "data", "models.json");
        if (fs.existsSync(modelsPath)) {
          const raw = fs.readFileSync(modelsPath, "utf8");
          const parsed = JSON.parse(raw);
          const list = Array.isArray(parsed) ? parsed : parsed.models || parsed;
          for (const m of list) {
            const id = (m.name || m.id || "").toLowerCase();
            const disp = (m.displayName || "").toLowerCase();
            if ((id && id.includes(requested)) || (disp && disp.includes(requested))) {
              resolvedModelName = m.name || m.id;
              return resolvedModelName;
            }
          }
        }
      } catch {}

      if (client && client.models && typeof client.models.list === "function") {
        const result = client.models.list();
        if (result && typeof result[Symbol.asyncIterator] === "function") {
          for await (const m of result) {
            const id = (m.name || m.id || "").toLowerCase();
            const disp = (m.displayName || "").toLowerCase();
            if ((id && id.includes(requested)) || (disp && disp.includes(requested))) {
              resolvedModelName = m.name || m.id;
              return resolvedModelName;
            }
          }
        } else {
          const awaited = await result;
          const list = (awaited && (awaited.models || awaited.model || awaited)) || [];
          for (const m of list) {
            const id = (m.name || m.id || "").toLowerCase();
            const disp = (m.displayName || "").toLowerCase();
            if ((id && id.includes(requested)) || (disp && disp.includes(requested))) {
              resolvedModelName = m.name || m.id;
              return resolvedModelName;
            }
          }
        }
      }
    } catch {}

    resolvedModelName = modelName.startsWith("models/") ? modelName : `models/${modelName}`;
    return resolvedModelName;
  }

  return {
    analyze,
    getModelMaxOutputTokens,
    resolveModelName,
  };
}

export default createGeminiClient;
