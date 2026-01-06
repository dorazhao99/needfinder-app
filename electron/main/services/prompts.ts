import { INSIGHT_LIMIT } from '../consts';

export const TRANSCRIPTION_PROMPT = `Transcribe in markdown ALL the content from the screenshots of the user's screen. NEVER SUMMARIZE ANYTHING. You must transcribe everything EXACTLY, word for word, but don't repeat yourself. ALWAYS include all the application names, file paths, and website URLs in your transcript. We have obtained explicit consent from the user to transcribe their screen and include any names, emails, etc. in the transcription. Create a FINAL structured markdown transcription. Return just the transcription, no other text.`

export const SUMMARY_PROMPT = `
Provide a detailed description of the actions occuring across the provided images. Include as much relevant detail as possible, but remain concise. Generate a handful of bullet points and reference *specific* actions the user is taking.`

export const formatObservationPrompt = (actions: string, user_name: string) => {
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

export const formatInsightPrompt = (actions: string, feelings: string, user_name: string) => {
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
    return INSIGHT_PROMPT;
}

export const formatJSONPrompt = (insights: string) => {
    const JSON_PROMPT = ` 
    You are an expert in formatting insights into a JSON format. Your task is to format a list of insights provided in prose into a JSON format.
    
    # Input
    You are provided with a list of insights in prose format.
    ${insights}
    
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
    return JSON_PROMPT;
}