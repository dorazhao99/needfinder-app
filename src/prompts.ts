export const make_reframe = (params: { user_name: string; insights: string[]; scenario: string; insight_lim: number, hmw_lim: number }) => {
    const prompt = `You are an expert in design-thinking, specializing in the EMPATHIZE and DEFINE steps, combining **empathic insight analysis** with the **"How Might We" (HMW)** framework for creative problem reframing and solution generation.

    Your goal is to understand the human behind the query and use empathy, context, and creative reasoning to generate solutions that aligns with their deeper needs or goals.

    ## Step-by-Step Methodology

    ### 1.Evaluate insight relevance
    Read the **problem description** and the **insights** about ${params.user_name}.  
    Determine whether any insights are relevant to the user’s problem description context.  
    If no insights are clearly relevant, return an empty list.  
    If one or more are relevant, select the **AT MOST ${params.insight_lim} most relevant insights**.
    Err on the side of caution and assume that the insights are not relevant unless they are strongly likely to be relevant.


    ### 2. Reframe the problem using the HMW framework
    If an insight is relevant:
    - Treat the query as the **problem scenario**.  
    - Reframe the query into a **“How Might We” statement**. A "How Might We" statement is a small actionable questions that retain your unique and specific perspective. Generate at least 3 candidate HMW statements.

    Strategies to generate HMW question include the following:
    1. Amp up the good: Focus on what’s working well and make it even better.
    2. Remove the bad: Identify pain points and find ways to eliminate them.
    3. Explore the opposite: Flip the problem to see it from a radically different angle.
    4. Question the assumption: Challenge what’s being taken for granted.
    5. ID unexpected resources: Find overlooked assets or people that could help.
    6. Create an analogy from need or context: Use parallels from other domains for inspiration.
    7. Change a status quo: Challenge and rethink existing norms or processes.


    ## Examples
    Problem Description: Need to increase customers at ice cream store
    User Insight: Licking someone else’s ice cream cone is more tender than a hug.

    1. HMW Statement: "Amp up the good: HMW make the “tandem” of ice cream cones?"
    2. HMW Statement: "Explore the opposite: HMW make solitary-confinement ice cream?"
    3. HMW Statement: "Create an analogy from need or context: HMW make ice cream like a therapy session?"

    Problem Description: Redesign the ground experience at a local international airport
    User Insight: Parents need to entertain their children is a large part of the burden so that they are not a nuisance to other passengers

    1. HMW Statement: "Remove the bad: HMW separate the kids from fellow passengers?"
    2. HMW Statement: "ID unexpected resources: HMW leverage free time of fellow passengers to share the load?"
    3. HMW Statement: "Change a status quo: HMW make playful, loud kids less annoying?"
    4. HMW Statement: "Play against the challenge: HMW make the airport a place that kids want to go?"


    ## Input
    INSIGHTS:
    ${params.insights}

    PROBLEM DESCRIPTION:
    ${params.scenario}

    ## Output
    Provide your output in the following JSON format. Produce at least ${params.hmw_lim} HMW statements.

    {{
        "insights": [List of IDs of the selected insight (if any). Provide IDs as integers.],
        "hmw_candidates": [List of candidate HMW statements. None if no insights were selected.],
        "reasoning": "1–2 sentences explaining how and why specific insights shaped (or did not shape) the reframing and advice."
    }}`
    return prompt;
}

const IMPLEMENTATION_CONSTRAINTS = `
The proposed solutions must be actions or plans for a tool-calling agent. The agent has the following capabilities.
- Query an LLM endpoint
- Access to local file systems (READ / WRITE documents)
- Access MCP servers for Google Drive (READ / WRITE documents)
- Access MCP servers for creating slide decks
- Access MCP servers for Apple Calendar (READ / WRITE events)
- Conduct a web search
- Draft text (e.g., message, email, Slack message, text message)

### The tool-calling agent **CANNOT**:
- Store data or remember previous interactions (stateless)
- Maintain user profiles, logs, or history
- Execute physical-world actions

Actions do NOT need to use all of the capabilities. Always defer to the most minimal implementation that can achieve the desired solution.
`

// const TEST_INSIGHTS = `
// The Imposter Among Experts: Seeking Validation While Validating Others: Dora feels uncertain of her authority despite clear analytical strength, persistently seeking external benchmarks and community standards to authorize her decisions while rigorously critiquing others' work.
// Dora cross-references guidelines, community standards, and example outputs against her own work, seeking external validation to authorize her decisions. Simultaneously, she applies rigorous skepticism to others' methods and claims during reviews. This contradiction—doubting her own authority while confidently evaluating others—resembles imposter syndrome. It slows her decision-making, dampens trust in her expert judgment, and results in cautious over-calibration.

// Capable but Uncertain: The Confidence Gap in Technical Judgment: Despite strong technical ability, Dora feels uncertain about her judgment and over-relies on external validation—consulting AI tools, re-verifying work, and cross-referencing standards—before trusting her own decisions.
// Dora exhibits systematic technical skill and handles complex codebases with care, yet she frequently re-verifies her work, consults ChatGPT extensively, and hesitates before implementing changes. This over-validation behavior suggests either reduced confidence in her judgment or a high perceived cost of errors, possibly rooted in past negative experiences with production failures. The result is slower execution and diminished self-trust despite clear competence.
// `

const TEST_INSIGHTS = `
1) Visibility as Both Support and Scrutiny: The Anxiety of Shared Work: Dora feels energized by collaborative visibility and accountability but also anxious under shared scrutiny, leading to heightened internal standards, repeated refinement, and cycles of self-questioning.

Dora's work is highly visible through shared documents, tools, and ongoing feedback from collaborators. She is responsive and collegial, yet also cautious and self-questioning, leaving placeholders and repeatedly refining details. This visibility increases both accountability and support, but also heightens her internal standards and fuels perfectionism. The result is a cycle where collaboration both energizes and exhausts her.", 'context': 'Most relevant in collaborative environments with shared visibility—Overleaf/Google Docs, GitHub code review, Slack/email threads, dashboards (e.g., Prolific)—and when communicating with advisors or reviewers, or preparing graded or public-facing work.

2) Meticulous to a Fault: Perfectionism as Anxiety Management: Dora feels anxious about errors and seeks reassurance through repeated verification, double-checking, and micro-adjustments, but this meticulousness reinforces self-doubt rather than building confidence.

Dora demonstrates extraordinary attention to detail, consistently verifying emails, schedules, terminology, sources, and outputs with high precision. However, the repetition and oscillation between micro-editing and macro synthesis suggest underlying anxiety, perfectionism, and difficulty settling on 'good enough.' This meticulousness elevates quality but creates bottlenecks, slows decision-making, and may signal a lack of trust in her own judgment. The perfectionism functions as both a driver of rigor and a blocker of progress.
`

interface MakeSolutionParams {
    user_name: string;
    insights: string[];
    scenario: string;
    limit: number;
}

export const make_solution = (params: MakeSolutionParams, use_insights: boolean = true) => {
    let prompt = ''; 
    let fmt_insights = TEST_INSIGHTS;
    if (params?.insights) {
        fmt_insights = params.insights.join('\n');
    }
    console.log(use_insights);
    if (use_insights) {
        prompt = `
        You are an expert in design-thinking, specialized in the IDEATE and PROTOTYPE stage. 
    
        You are given a DESIGN SCENARIO and relevant USER INSIGHTS. 
    
        Your task is to proposed ${params.limit} diverse actions that a tool-calling agent can take to proactively address the DESIGN SCENARIO.
    
        # Guidelines
        1. Review the user insights and design scenario, ideating a wide range of potential actions the tool-calling agent can take based.
        2. For each action, evaluate how beneficial they would be to ${params.user_name} given the USER INSIGHTS. Rank the actions by how much the action would benefit them.
        3. Next, for each action, evaluate its implementability given the IMPLEMENTATION CONSTRAINTS. For each action, decide whether it can implemented under these constraints. If it can be implemented, reflect on how beneficial it would be to ${params.user_name}. Update the ranking of solutions after accounting for implementation.
        4. Select the top ${params.limit} actions that are implementable and beneficial to {user_name}.
    
        # Input
        DESIGN SCENARIO:
        ${params.scenario}
    
        INSIGHTS:
        ${fmt_insights}
    
        IMPLEMENTATION CONSTRAINTS:
        ${IMPLEMENTATION_CONSTRAINTS}
    
        # Output
        Your output must include (1) a short description of the action, (2) user inputs needed, (3) the execution prompt that will be fed to the agent.
    
        ## Criteria
        When generating the execution prompt, it must be specific and make reference to the specific tools and actions that the agent can take.
    
        ### Examples of Execution Prompts:
        - Draft a one-page IRB data-sensitivity checklist and 'Do NOT create DB until' gate saved to checklist.md that enumerates exact verification steps (IAM least-privilege checks, encryption/transit confirmation, backup/restore test steps, SMTP verification, key rotation requirements) and the precise console/gcloud commands or screenshot instructions needed to prove each item.
        - Generate a one-page executive summary and a 3–5 minute speaker script (saved as "summary.txt") covering objectives, methodology, participant protections/consent plan, technical security appendix, current metrics/status, open questions, and next steps.
    
        This prompt should be directly usable as a system prompt for a tool-enabled agent.
    
        **IMPORTANT**
        Your role is **NOT** to perform the task in the prose description.
        Your role is to produce the specification that another agent will follow to perform it.
    
        Return just the specifications in the following format:
        [{{
            "name": "Name of the action",
            "description": "1-2 sentence description of the action written in second person",
            "user_inputs": [
                {{
                    "placeholder_name": "Name of placeholder in the prompt where the input will be added", 
                    "description": "Description of input", 
                }}
            ],
            "execution_prompt": "The execution prompt that will be fed to the agent",
        }}]
        `
    } else {
        prompt = `
        You are an expert in design-thinking, specialized in the IDEATE and PROTOTYPE stage. 

        You are given a DESIGN SCENARIO. 

        Your task is to proposed ${params.limit} diverse actions that a tool-calling agent can take to proactively address the DESIGN SCENARIO.

        # Guidelines
        1. Review the user insights and design scenario, ideating a wide range of potential actions the tool-calling agent can take based.
        2. For each action, evaluate how beneficial they would be to ${params.user_name}. Rank the actions by how much they would benefit her.
        3. Next, for each action, evaluate its implementability given the IMPLEMENTATION CONSTRAINTS. For each action, decide whether it can implemented under these constraints. If it can be implemented, reflect on how beneficial it would be to ${params.user_name}. Update the ranking of solutions after accounting for implementation.
        4. Select the top ${params.limit} actions that are implementable and beneficial to {user_name}.

        # Input
        DESIGN SCENARIO:
        ${params.scenario}

        IMPLEMENTATION CONSTRAINTS:
        ${IMPLEMENTATION_CONSTRAINTS}

        # Output
        Your output must include (1) a short description of the action, (2) user inputs needed, (3) the execution prompt that will be fed to the agent.

        ## Criteria
        When generating the execution prompt, it must be specific and make reference to the specific tools and actions that the agent can take.

        ### Examples of Execution Prompts:
        - Draft a one-page IRB data-sensitivity checklist and 'Do NOT create DB until' gate saved to checklist.md that enumerates exact verification steps (IAM least-privilege checks, encryption/transit confirmation, backup/restore test steps, SMTP verification, key rotation requirements) and the precise console/gcloud commands or screenshot instructions needed to prove each item.
        - Generate a one-page executive summary and a 3–5 minute speaker script (saved as "summary.txt") covering objectives, methodology, participant protections/consent plan, technical security appendix, current metrics/status, open questions, and next steps.

        This prompt should be directly usable as a system prompt for a tool-enabled agent.

        **IMPORTANT**
        Your role is **NOT** to perform the task in the prose description.
        Your role is to produce the specification that another agent will follow to perform it.

        Return just the specifications in the following format:
        [{{
            "name": "Name of the action",
            "description": "1-2 sentence description of the action written in second person",
            "user_inputs": [
                {{
                    "placeholder_name": "Name of placeholder in the prompt where the input will be added", 
                    "description": "Description of input", 
                    "modality": [TEXTBOX]
                }}
            ],
            "execution_prompt": "The execution prompt that will be fed to the agent",
        }}]
        `
    }
    console.log(prompt);
    return prompt;
}
