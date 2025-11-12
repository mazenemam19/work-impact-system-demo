import createGeminiClient from "../llm/gemini-client.js";
import { buildImpactAnalysisPrompt } from "../llm/prompts.js";

export const createImpactAnalyzer = (apiKey) => {
  const llm = createGeminiClient(apiKey);

  const analyzeWork = async (workData, userProfile) => {
    console.log("🤖 Analyzing work with LLM...\n");
    const prompt = buildImpactAnalysisPrompt(workData, userProfile);
    const analysis = await llm.analyze(prompt);

    return {
      generatedAt: new Date().toISOString(),
      period: workData.period,
      analysis,
      rawData: workData.summary,
    };
  };

  return { analyzeWork };
};
