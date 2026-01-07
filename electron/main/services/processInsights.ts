// Nightly script that processes screenshots and creates insights for the day 
import fs from 'node:fs';
import { app } from 'electron';
import path from 'node:path';
import betterSqlite3 from 'better-sqlite3';
import dotenv from 'dotenv';
import z from "zod";
import { callLLM } from './llm';
import { TRANSCRIPTION_PROMPT, SUMMARY_PROMPT, formatObservationPrompt, formatInsightPrompt, formatJSONPrompt, formatMetaInsightPrompt } from './prompts';
import { WINDOW_SIZE, CONTEXT_SIZE, SESSION_GAP, MODEL_SELECTION, DEV_MODEL_SELECTION } from '../consts';
import { zodResponseFormat } from 'openai/helpers/zod';
import { parseModelJson } from './jsonParse';

dotenv.config();

const isTest = false;
const modelSelection = isTest ? DEV_MODEL_SELECTION : MODEL_SELECTION;

const OBSERVATION_SCHEMA = z.object({
  observations: z.array(z.object({
    description: z.string(),
    evidence: z.string(),
    confidence: z.number(),
  })),
});



const getImages = (files: string[], file_dir: string) => {
  return files.map(file => {
    const filePath = path.join(file_dir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    const imageBuffer = fs.readFileSync(filePath);
    return {
      type: "image_url",
      image_url: {
        "url": `data:image/jpeg;base64,${imageBuffer.toString("base64")}`,
      },
    };
  }).filter(img => img !== null);
}

const splitDays = async() => {
    const files_by_days: { [key: string]: string[] } = {};
    const file_dir = path.join(process.env.HOME || '', '.cache', 'recordr');
    console.log("file_dir: ", file_dir);
    const file_names = fs.readdirSync(file_dir);
    const files_with_stats = file_names.map(name => ({
        name,
        path: path.join(file_dir, name),
        mtime: fs.statSync(path.join(file_dir, name)).mtime
        }));
    const sorted_files = files_with_stats
        .filter(file => file.name.endsWith('.jpg'))
        .sort((a, b) => a.mtime.getTime() - b.mtime.getTime()) // Sort by modification time, oldest first
        .map(file => file.name);
    for (const file of sorted_files) {
        const file_time = fs.statSync(path.join(file_dir, file)).mtime;
        const day = file_time.toISOString().split('T')[0];
        if (!files_by_days[day]) {
            files_by_days[day] = [];
        }
        files_by_days[day].push(file);
    }
    return files_by_days;
}

const processTraces = async(sorted_files: string[]) => {
    // process all of the files in the session
    const file_dir = path.join(process.env.HOME || '', '.cache', 'recordr');
    const sessions = [];

    let lastFile = fs.statSync(path.join(file_dir, sorted_files[0])).mtime;
    let currentSession: string[] = [];
    for (const sf of sorted_files) {
    let updateTime = fs.statSync(path.join(file_dir, sf)).mtime;
    let timeDiff = updateTime.getTime() - lastFile.getTime();
    if (timeDiff < SESSION_GAP) {
        currentSession.push(sf);
    } else {
        sessions.push(currentSession);
        currentSession = [sf];
    }
    lastFile = updateTime;
    // sessions.push(session);
    }
    if (currentSession.length > 0) {
    sessions.push(currentSession);
    }

    // transcribe and summarize across sessions 
    let idx = 0;
    let end_idx = 0;
    const transcription_prompts = []
    const summary_prompts = []
    const timestamps = []
    console.log("sessions: ", sessions.length)
    for (const session of sessions) {
    const session_length = isTest ? 10 : session.length;
    while (idx < session_length) {
        end_idx = Math.min(idx + WINDOW_SIZE, session.length);
        const session_files = session.slice(idx, end_idx);
        const session_images = getImages(session_files, file_dir);
        const first_file = fs.statSync(path.join(file_dir, session[idx])).mtime;
        const last_file = fs.statSync(path.join(file_dir, session[end_idx - 1])).mtime
        const timeStamp = `${first_file.toLocaleTimeString()} - ${last_file.toLocaleTimeString()}`
        timestamps.push(timeStamp)

        const t_prompt = [{
        type: "text",
        text: TRANSCRIPTION_PROMPT
        }, ...session_images];
        const s_prompt = [{
        type: "text",
        text: SUMMARY_PROMPT
        }, ...session_images];
        transcription_prompts.push(t_prompt);
        summary_prompts.push(s_prompt);
        idx = end_idx
    }

    if (isTest) {
        break;
    }
  }
  const transcription_results = await Promise.all(
    transcription_prompts.map(p =>
      callLLM(p, modelSelection.transcription)
    )
  );
  const summary_results = await Promise.all(
    summary_prompts.map(p =>
      callLLM(p, modelSelection.transcription)
    )
  );
  const interaction_traces = [];
  for (let i = 0; i < transcription_results.length; i++) {
    if (!transcription_results[i].success || !summary_results[i].success) {
      console.error("Error calling LLM: ", transcription_results[i].error || summary_results[i].error);
      continue;
    }
    const transcription_result = transcription_results[i].content;
    const summary_result = summary_results[i].content;
    const timestamp = timestamps[i];
    let trace = `User's actions at ${timestamp}:\n${summary_result}\n\nTranscription of User's Screen:\n${transcription_result}`
    console.log("trace: ", trace)
    interaction_traces.push(trace);
  }
  return interaction_traces;
}


const getSessionObservations = async(session_trace: string[], user_name: string) => {
  const session_length = session_trace.length
  const prompts = []
  for (let index = 0; index < session_length; index += CONTEXT_SIZE) {
    const sel_trace = session_trace.slice(index, index + CONTEXT_SIZE)
    const actions = sel_trace.join("\n")
    const observation_prompt = formatObservationPrompt(actions, user_name)
    prompts.push(observation_prompt)
  }
  const results = await Promise.all(
    prompts.map(p => {
      return callLLM(p, modelSelection.observation, zodResponseFormat(OBSERVATION_SCHEMA, "obs_response"));
    })
  );
  console.log("results: ", results);
  const output = results
    .filter(r => r.success && r.content)
    .map(r => {
      try {
        // Parse JSON string if content is a string, otherwise use as-is
        const parsed = typeof r.content === 'string' ? parseModelJson(r.content) : r.content;
        // Validate against schema
        return OBSERVATION_SCHEMA.parse(parsed);
      } catch (error) {
        console.error('Error parsing observation result:', error, 'Content:', r.content);
        // Return empty observations on parse error
        return { observations: [] };
      }
    });
  console.log("output: ", output);
  return output;
}

const getInsights = async(interaction_traces: string[], user_name: string) => {
  const observations = await getSessionObservations(interaction_traces, user_name);
  const actions = observations.map(obs => obs.observations.map(ob => ob.evidence));
  const feelings = observations.map(obs => obs.observations.map(ob => ob.description));
  const actions_string = actions.join("\n")
  const feelings_string = feelings.join("\n")

  const INSIGHT_PROMPT = formatInsightPrompt(actions_string, feelings_string, user_name);
  const insights = await callLLM([{type: "text", text: INSIGHT_PROMPT}], modelSelection.insight);
  console.log("insights: ", insights);
  if (!insights.success || !insights.content) {
    console.error("Error calling LLM: ", insights.error);
    return { insights: [] };
  }
  const JSON_FORMAT = formatJSONPrompt(insights.content);
  const json_insights = await callLLM([{type: "text", text: JSON_FORMAT}], modelSelection.format);
  if (json_insights.success && json_insights.content) {
    const fmt_insights = parseModelJson(json_insights.content);
    return fmt_insights;
  } else {
    console.error("Error calling LLM: ", json_insights.error);
    return { insights: [] };
  }
}

const mergeInsights = async(insights: any[], user_name: string, session_num: number) => {
    // merge insights into meta insights
    const fmt_insights = JSON.stringify(insights);
    const meta_insights_prompt = formatMetaInsightPrompt(fmt_insights, user_name, session_num);
    const meta_insights = await callLLM([{type: "text", text: meta_insights_prompt}], modelSelection.synthesis);
    if (meta_insights.success && meta_insights.content) {
        const fmt_meta_insights = parseModelJson(meta_insights.content);
        return fmt_meta_insights;
    } else {
        console.error("Error calling LLM: ", meta_insights.error);
        return { insights: [] };
    }
}

const saveInsightsDB = (db: betterSqlite3.Database, insights: { insights: { title: string; insight: string; context: string; supporting_evidence: string }[] }) => {
    const stmt = db.prepare('INSERT INTO insights (title, tagline, description, context, supporting_evidence, metainsight) VALUES (?, ?, ?, ?, ?, ?)');
    for (const insight of insights.insights) {
        stmt.run(insight.title, "", insight.insight, insight.context, insight.supporting_evidence, 0);
    }
}


const saveMetaInsightsDB = (db: betterSqlite3.Database, insights: { insights: { title: string; tagline: string; insight: string; context: string; reasoning: string }[] }) => {
    const stmt = db.prepare('INSERT INTO insights (title, tagline, description, context, supporting_evidence, metainsight) VALUES (?, ?, ?, ?, ?, ?)');
    for (const insight of insights.insights) {
        console.log("merged insight: ", insight);
        const evidence = insight.reasoning
        stmt.run(insight.title, insight.tagline, insight.insight, insight.context, evidence, 1);
    }
}


export const processInsights = async(user_name: string) => {
    // process insights for each day
    const files_by_days = await splitDays();
    const session_num = Object.keys(files_by_days).length;
    const dbPath = path.join(app.getPath('userData'), 'app.db');
    const db = new betterSqlite3(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");

    if (session_num < 1) {
        console.error("Not enough sessions to merge insights");
        return {
            success: false,
            message: "Not enough sessions to merge insights"
        }
    }

    try {
        const all_insights = [];
        for (const day in files_by_days) {
            const files = files_by_days[day];
            const interaction_traces = await processTraces(files);
            const insights = await getInsights(interaction_traces, user_name);
            all_insights.push(...insights.insights);
            saveInsightsDB(db, insights);
        }

        // merge insights into meta insights
        const meta_insights = await mergeInsights(all_insights, user_name, session_num);
        
        saveMetaInsightsDB(db, meta_insights);
    } catch (error) {
        console.error("Error processing insights: ", error);
        db.close();
        return {
            success: false,
            message: "Error processing insights"
        }
    }
    db.close();
    return {
        success: true,
        message: "Insights processed successfully"
    }
}

// (async () => {
//   const stamp = new Date().toISOString();
//   const out = `/tmp/com.stanfordhci.recordr.nightly.last_run.json`;
//   const interaction_traces = await processTraces();
//   console.log("interaction_traces: ", interaction_traces);
//   const insights = await getInsights(interaction_traces);
//   console.log("insights: ", insights);
//   saveDB(insights);
//   fs.writeFileSync(out, JSON.stringify({ ok: true, ranAt: stamp, traces: interaction_traces, insights: insights}, null, 2));
//   process.exit(0);
// })().catch((err) => {
//   console.error("error: ", err)
//   try {
//     fs.writeFileSync(
//       `/tmp/com.stanfordhci.recordr.nightly.error.json`,
//       JSON.stringify({ ok: false, error: String(err?.stack || err) }, null, 2)
//     );
//   } catch {}
//   process.exit(1);
// });

