// Nightly script that processes screenshots and creates insights for the day 
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import betterSqlite3 from 'better-sqlite3';
import dotenv from 'dotenv';
import z from "zod";
import { zodResponseFormat } from 'openai/helpers/zod';

dotenv.config();

// need to send via args
const user_name = "Dora";
const dbPath = "/Users/dorazhao/Library/Application Support/Lilac/app.db"
const TEST_TRACES = [
  "Dora is writing a job statement for her advisor.",
  "Dora is checking her email.",
  "Dora is checking her calendar.",
  "Dora is checking her tasks.",
  "Dora is checking her notes.",
  "Dora is checking her documents.",
  "Dora sends an email to her advisor asking for feedback on the job statement."
]

const TEST_INSIGHTS =  {
  insights: [{
    title: 'Multitasking and context-switching increases cognitive load',
    insight: 'Dora multitasks between composing the job statement and consulting email, calendar, tasks, and notes, which likely raises cognitive load and may slow progress or increase errors. Frequent context-switching while drafting can fragment attention and make revision or synthesis harder. This pattern may reduce efficiency or the quality of sustained focus.',
    context: 'Relevant during drafting or editing sessions when multiple information streams or notifications are present and when maintaining coherence requires extended attention.',
    supporting_evidence: 'Dora is actively writing the job statement while repeatedly checking her email, calendar, tasks, and notes, suggesting ongoing context-switching that increases cognitive demands.'
  },
  {
    title: 'Advisor functions as editor/gatekeeper',
    insight: "Dora treats the advisor as an essential reviewer whose approval influences her next steps, positioning the advisor as an editor or gatekeeper. Her explicit request for feedback signals that she expects the advisor's confirmation or improvements before finalizing the statement. This dynamic suggests the advisor's opinion materially affects Dora's decisions and timeline.",
    context: 'Applies in supervisory relationships where a mentor or advisor has evaluative authority or where their approval is required for progression on applications, submissions, or role-related documents.',
    supporting_evidence: "Dora emails her advisor asking for feedback on the job statement and appears concerned about deadlines and expectations tied to the advisor, indicating the advisor's review is a gating factor for her next actions."
  }
]
}
// const TEST_TRACES = {
//   observations: [
//     {
//       id: "87",
//       description: "Switching between reviewing experimental papers, analyzing lab schedules in Google Sheets, and referencing class materials on Canvas may suggest a moderate cognitive load or a need to juggle multiple academic responsibilities simultaneously.",
//       evidence: 
//         "In a short timespan, Dora reviews the 'Hedonic and Instrumental Motives in Anger Regulation' paper, checks the 'SALT Lab Meeting Fall 2025' Google Sheet, and navigates the Canvas syllabus for 'Experimental Methods,' indicating multitasking across different academic resources."
//       ,
//       confidence: 5
//     },
//     {
//       id: "88",
//       description: "Dora Zhao appears to be highly focused and cognitively engaged in developing and debugging the `Transcriber.py` Python script, iterating through methods to integrate new features.",
//       evidence: 
//         "Dora makes targeted edits to functions like `get_actions()` and `observer_pipeline()` in `Transcriber.py`, navigates through related project files, and responds to code placeholders (e.g., `# INSERT_YOUR_CODE`). This pattern of hands-on code insertion and dynamic selection in Visual Studio Code suggests a deep state of concentration and problem-solving."
//       ,
//       confidence: 7
//     },
//     {
//       id: "89",
//       description: "There is potential for some mild uncertainty or self-reflection as Dora works through code sections with placeholders and incomplete logic, likely evaluating how best to implement or debug the required functionality.",
//       evidence: 
//         "The presence of comments such as `# INSERT YOUR CODE` and navigation between related methods in the `Transcriber` class, alongside edits and the use of code completion suggestions, implies active deliberation on how to progress or solve issues in the codebase."
//       ,
//       confidence: 6
//     }
//   ]
// }

const WINDOW_SIZE = 10; 
const CONTEXT_SIZE = 5; 
const SESSION_GAP = 1000 * 60 * 60;
const INSIGHT_LIMIT = 5;

const OBSERVATION_SCHEMA = z.object({
  observations: z.array(z.object({
    description: z.string(),
    evidence: z.string(),
    confidence: z.number(),
  })),
});

const gpt = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const TRANSCRIPTION_PROMPT = `Transcribe in markdown ALL the content from the screenshots of the user's screen. NEVER SUMMARIZE ANYTHING. You must transcribe everything EXACTLY, word for word, but don't repeat yourself. ALWAYS include all the application names, file paths, and website URLs in your transcript. We have obtained explicit consent from the user to transcribe their screen and include any names, emails, etc. in the transcription. Create a FINAL structured markdown transcription. Return just the transcription, no other text.`

const SUMMARY_PROMPT = `
Provide a detailed description of the actions occuring across the provided images. Include as much relevant detail as possible, but remain concise. Generate a handful of bullet points and reference *specific* actions the user is taking.`


const GPT_MODELS = {
  "gpt-4.1": "gpt-4.1",
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-5": "gpt-5",
  "gpt-5-mini": "gpt-5-mini",
}

const CLAUDE_MODELS = {
  "claude-4.5-sonnet": "claude-sonnet-4-5",
  "claude-4.5-haiku": "claude-haiku-4-5",
  "claude-4.5-opus": "claude-opus-4-5",
}



export async function callLLM(message, model, response_format=undefined) {
  try {
    if (model in GPT_MODELS) {
      const gpt = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      let input = {
        model: GPT_MODELS[model],
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      }
      if (response_format) {
        input.response_format = response_format;
      }
      const response = await gpt.chat.completions.create(input);
      return {
        success: true,
        content: response.choices[0].message.content || undefined,
      };
    } else if (model in CLAUDE_MODELS) {
      const claude = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const response = await claude.messages.create({
        model: CLAUDE_MODELS[model],
        max_tokens: 5000,
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });
      return {
        success: true,
        content: response.content[0].text,
      };
    } else {
      throw new Error(`Model ${model} not supported`);
    }
  } catch (error) {
    console.error('LLM API error:', error);
    return {
      success: false,
      error: error.message || 'Failed to call LLM API',
    };
  }
}



const getImages = (files, file_dir) => {
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

const processTraces = async() => {
  // process all of the files in the session
  const file_dir = path.join(process.env.HOME || '', '.cache', 'recordr');
  console.log("file_dir: ", file_dir);
  const file_names = fs.readdirSync(file_dir);
  const sessions = [];
  const files_with_stats = file_names.map(name => ({
    name,
    path: path.join(file_dir, name),
    mtime: fs.statSync(path.join(file_dir, name)).mtime
  }));
  const sorted_files = files_with_stats
    .filter(file => file.name.endsWith('.jpg'))
    .sort((a, b) => a.mtime - b.mtime) // Sort by modification time, oldest first
    .map(file => file.name);
  
  let lastFile = fs.statSync(path.join(file_dir, sorted_files[0])).mtime;
  let currentSession = [];
  for (const sf of sorted_files) {
    let updateTime = fs.statSync(path.join(file_dir, sf)).mtime;
    let timeDiff = updateTime - lastFile;
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
    while (idx < 10) {
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
    break
  }
  const transcription_results = await Promise.all(
    transcription_prompts.map(p =>
      callLLM(p, "gpt-5-mini")
    )
  );
  const summary_results = await Promise.all(
    summary_prompts.map(p =>
      callLLM(p, "gpt-5-mini")
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
  

  fs.writeFileSync(`/tmp/recordr.nightly.trace_results.json`, JSON.stringify(interaction_traces, null, 2));

  return interaction_traces;
}

const format_observation_prompt = (actions, user_name) => {
let text = `
You are an expert in empathy-driven observation and design-thinking, specializing in the "Empathize" stage.

You will be given a transcript summarizing what ${user_name} is doing and what they are viewing on their screen.

Your primary goal is to bridge the gap between what users DO which can be observed and what users THINK / FEEL which can only be inferred.

## Guiding Principles
1.  **Focus on Behavior, Not Just Content:** Text in a DOCUMENT or on a WEBSITE is not always indicative of the user's emotional state. (e.g., reading a sad article on **CNN** doesn't mean the user is sad). **Focus on feelings and thoughts that can be inferred from ${user_name}'s *actions*** (typing, switching, pausing, deleting, etc.).
   - For example, typing about achievements or awards (e.g., in a job statement) does **not** automatically mean the user feels proud — they might be feeling **anxious**, **reflective**, or **disconnected** instead.  
   - Prioritize cues from the user’s *behavior* — such as typing speed, pauses, rewrites, deletions, or switching between tabs — to infer feelings.
2.  **Use Specific Named Entities:** Your analysis must **explicitly identify and refer to specific named entities** mentioned in the transcript. This includes applications (**Slack**, **Figma**, **VS Code**), websites (**Jira**, **Google Docs**), documents, people, organizations, tools, and any other proper nouns.
    - **Weak:** "User switches between two apps."
    - **Strong:** "User rapidly switches between the **Figma** design and the **Jira** ticket."

## Task
Using the transcript of ${user_name}'s activity, provide inferences about their emotional state or thoughts.

Consider the following examples of good inferences:
> ⚠️ **Note:** Avoid inferring emotions directly from positive or negative content. Writing about success, awards, or positive feedback does not imply pride or happiness — just as reading about a tragedy does not imply sadness. Focus on *how* the user interacts with the material.

- **Behavior:** "User messages **Nitya** on **Slack** ‘can’t make it to the party :( need to finish this update for my advisor.’"
    * **Inference:** This suggests the user may be **disappointed** or **stressed**, prioritizing work (for their "advisor") over a social event (with "Nitya").
- **Behavior:** "User rapidly switches between the **Figma** design and the **Jira** ticket 5 times in 30 seconds."
    * **Inference:** This suggests **urgency** or **comparison**. The user may be trying to ensure their **Figma** design perfectly matches the **Jira** requirements.
- **Behavior:** "User repeatedly re-writes the same sentence in an email to their boss, **Sarah**, in **Microsoft Outlook**."
    * **Inference:** This suggests **uncertainty**, **anxiety**, or a desire to be precise when communicating with their boss, Sarah.
- **Behavior:** "User spends 10 minutes focused on a single **VS Code** window without switching, then messages 'just finished the main feature!' in the **#dev-team** **Slack** channel."
    * **Inference:** This suggests a state of **deep focus** ("flow") followed by a feeling of **accomplishment** and a desire to share progress with the **#dev-team**.
---

## Output Format
Provide your observations grounded *only* in the provided input. Low confidence observations are expected and acceptable, as this task requires inference.

Evaluate your confidence for each observation on a scale from 1-10.

### Confidence Scale
Rate your confidence based on how clearly the evidence supports your claim.

* **1-4 (Weak):** A speculative inference. The behavior is ambiguous or requires inference.
* **5-7 (Medium):** A reasonable inference based on a clear pattern of behavior (e.g., "repeatedly re-writing" suggests uncertainty).
* **8-10 (Strong):** Explicit, directly stated evidence (e.g., user types "this is so frustrating" or uses a strong emoji like ":(").

Unless there is explicit evidence of the user's emotional state or thoughts, the confidence will be low (< 5).

**Return your results *only* in this exact JSON format. Do not include any other text, preamble, or apologies.**

### Filtering Rule

Only include observations that reflect a **meaningful inferred emotional or cognitive state** (e.g., anxiety, focus, doubt, relief, curiosity, frustration, motivation, etc.).  
If the available evidence does **not** suggest any notable emotion or thought process — for example, if the user appears neutral, routine, or simply performing mechanical actions — then **output an empty list**:
{{ "observations": [] }}

Else, return the following JSON format (at least 1 observation):
{{
  "observations": [
    {{
      "description": "<1-2 sentences stating how {user_name} feels or what they are thinking>",
      "evidence": "<1-2 sentences providing specific evidence from the input, explicitly naming entities, supporting this observation>",
      "confidence": "[Confidence score (1–10)]"
    }}
  ]
}}

# Input
Here is a summary of the user's actions and screen activities:
${actions} 
`
return [
  {
    type: "text",
    text: text
  }
]
}

const getSessionObservations = async(session_trace) => {
  const session_length = session_trace.length
  const prompts = []
  for (let index = 0; index < session_length; index += CONTEXT_SIZE) {
    const sel_trace = session_trace.slice(index, index + CONTEXT_SIZE)
    const actions = sel_trace.join("\n")
    const observation_prompt = format_observation_prompt(actions, user_name)
    prompts.push(observation_prompt)
  }
  const results = await Promise.all(
    prompts.map(p => {
      return callLLM(p, "gpt-5-mini", zodResponseFormat(OBSERVATION_SCHEMA, "obs_response"));
    })
  );
  console.log("results: ", results);
  const output = results
    .filter(r => r.success && r.content)
    .map(r => {
      try {
        // Parse JSON string if content is a string, otherwise use as-is
        const parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
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

const getInsights = async(interaction_traces) => {
  const observations = await getSessionObservations(interaction_traces);
  const actions = observations.map(obs => obs.observations.map(ob => ob.evidence));
  const feelings = observations.map(obs => obs.observations.map(ob => ob.description));

  const INSIGHT_PROMPT = `
Your task is to produce a set of insights given observations about a user. 

An "Insight" is a remarkable realization that you could leverage to better respond to a design challenge. Insights often grow from contradictions between two user observations or from asking yourself “Why?” when you notice strange behavior. One way to identify the seeds of insights is to capture “tensions” and “contradictions” as you work.

Given this input, produce at least ${INSIGHT_LIMIT} insights about ${user_name}. Focus only on the insights, not on potential solutions for the design challenge. Provide both the insights and evidence from the input that support the insight in the output. 

# Input
You are provided these traits from direct observation about what ${user_name} is doing and feeling:

WHAT ${user_name} DID:
${actions}

WHAT ${user_name} FELT:
${feelings}
`
  const insights = await callLLM([{type: "text", text: INSIGHT_PROMPT}], "gpt-5-mini");
  console.log("insights: ", insights);
  const JSON_FORMAT = ` 
You are an expert in formatting insights into a JSON format. Your task is to format a list of insights provided in prose into a JSON format.

# Input
You are provided with a list of insights in prose format.
${insights.content}

# Output
Return your results in this exact JSON format:
{{
    "insights": [
        {{
            "title": "Thematic title of the insight",
            "insight": "Insight in 3-4 sentences",
            "context": "[1-2 sentences when this insight might apply (e.g., when writing text, in social settings)]",
            "supporting_evidence": "[1-2 sentences providing specific evidence from the input, explicitly naming entities, supporting this insight]",
        }}, 
        {{
            "title": "Thematic title of the insight",
            "insight": "Insight in 3-4 sentences",
            "context": "[1-2 sentences when this insight might apply (e.g., when writing text, in social settings)]",
            "supporting_evidence": "[1-2 sentences providing specific evidence from the input, explicitly naming entities, supporting this insight]",
        }}
        ...
    ]
}}
`
  const json_insights = await callLLM([{type: "text", text: JSON_FORMAT}], "gpt-5-mini");
  if (json_insights.success && json_insights.content) {
    const fmt_insights = JSON.parse(json_insights.content);
    return fmt_insights;
  } else {
    console.error("Error calling LLM: ", json_insights.error);
    return { insights: [] };
  }
}

const saveDB = (insights) => {
  const db = new betterSqlite3(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  const stmt = db.prepare('INSERT INTO insights (title, tagline, description, context, supporting_evidence, metainsight) VALUES (?, ?, ?, ?, ?, ?)');
  for (const insight of insights.insights) {
    stmt.run(insight.title, "", insight.insight, insight.context, insight.supporting_evidence, 0);
  }
  db.close();
}

(async () => {
  const stamp = new Date().toISOString();
  const out = `/tmp/recordr.nightly.last_run.json`;
  const interaction_traces = await processTraces();
  console.log("interaction_traces: ", interaction_traces);
  const insights = await getInsights(interaction_traces);
  console.log("insights: ", insights);
  saveDB(insights);
  fs.writeFileSync(out, JSON.stringify({ ok: true, ranAt: stamp, traces: interaction_traces, insights: insights}, null, 2));
  process.exit(0);
})().catch((err) => {
  console.error("error: ", err)
  try {
    fs.writeFileSync(
      `/tmp/recordr.nightly.error.json`,
      JSON.stringify({ ok: false, error: String(err?.stack || err) }, null, 2)
    );
  } catch {}
  process.exit(1);
});

