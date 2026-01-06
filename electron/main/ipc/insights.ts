import { ipcMain } from 'electron';
import axios from 'axios';
import { getMergedInsights } from './db';

const INSIGHT_LIMIT = 2;

interface Insight {
  id: number;
  title: string;
  tagline: string;
  description: string;
  context: string;
  supporting_evidence: string;
}

async function getRelevantInsights(query: string) {
  console.log("Query: ", query);
  const insights = getMergedInsights() as Insight[];
  const insightIds: number[] = [];
  const fmtInsights: string[] = [];
  insights.forEach((insight: Insight) => {
    insightIds.push(insight.id);
    fmtInsights.push(`${insight.title}: ${insight.tagline}\n${insight.description}\nContext Insight Applies: ${insight.context}`);
  });
  const response = await axios.post(
    "https://api.voyageai.com/v1/rerank",
    {
      query: query,
      documents: fmtInsights,
      model: "rerank-2.5-lite",
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status !== 200) {
    throw new Error(`Failed to get relevant insights: ${response.statusText}`);
  }
  console.log("Response: ", response.data);
  const relevantInsightsIdxs: { relevance_score: number; index: number }[] = response.data.data.slice(0, INSIGHT_LIMIT);
  let relevantInsights: {insights: string[]; insightIds: number[]} = {insights: [], insightIds: []};
  relevantInsightsIdxs.forEach((i: {relevance_score: number; index: number}) => {
    let idx = i['index'];
    relevantInsights.insights.push(fmtInsights[idx]);
    relevantInsights.insightIds.push(insightIds[idx]);
  });

  return relevantInsights;
}

ipcMain.handle('insights:getRelevant', (event, query: string) => {
  return getRelevantInsights(query);
});