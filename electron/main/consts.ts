export const MODEL_SELECTION = {
    "transcription": "gpt-5-mini",
    "observation": "gpt-4.1",
    "insight": "claude-4.5-sonnet",
    "format": "gpt-4.1",
    "synthesis": "claude-4.5-sonnet"
}

export const DEV_MODEL_SELECTION = {
    "transcription": "gpt-5-mini",
    "observation": "gpt-5-mini",
    "insight": "gpt-5-mini",
    "format": "gpt-5-mini",
    "synthesis": "gpt-5-mini"
}

export const DEFAULT_FILE_DIR = '~/.cache/recordr';
export const WINDOW_SIZE = 10; 
export const CONTEXT_SIZE = 5; 
export const SESSION_GAP = 1000 * 60 * 60;
export const INSIGHT_LIMIT = 5;

export const TEST_TRACES = [
    "Dora is writing a job statement for her advisor.",
    "Dora is checking her email.",
    "Dora is checking her calendar.",
    "Dora is checking her tasks.",
    "Dora is checking her notes.",
    "Dora is checking her documents.",
    "Dora sends an email to her advisor asking for feedback on the job statement."
  ]

export const TEST_INSIGHTS =  {
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