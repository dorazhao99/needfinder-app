import { useState, useEffect, useRef } from 'react';
import {Button, Switch} from '@mantine/core';
import { IconArrowUp, IconRefresh, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import SidePanel, { Solution } from '@/components/SidePanel';
import { make_solution } from '@/prompts';
import { parseModelJson } from '@/utils';
import { SOLUTION_MODEL, SOLUTION_LIMIT } from '@/configs';
import './home.css';

interface HomeProps {
  userName?: string | null;
}

const testCase = [{
  solution: {
    "name": "Expert Voice Confidence Reframe", 
    "description": "Generate a personalized confidence-building document that validates Dora's expert judgment by showing how her unique perspective adds value beyond perfect community alignment, and provides concrete examples of when deviation from norms can signal important insights.",
  },
  agent_prompt: `You are helping an expert CHI reviewer build confidence in trusting her expert evaluation even when it may diverge from perceived community norms.\n\nAnalyze the review draft provided in REVIEW_DRAFT and the specific concerns in SPECIFIC_CONCERNS.\n\nCreate a document saved as 'confidence_reframe.md' that includes:\n\n1. **Your Expert Value** (3-4 sentences): Identify 2-3 specific elements in her review draft that demonstrate unique expert insight or valuable critical perspective that goes beyond formulaic review patterns.\n\n2. **When Divergence Signals Quality** (bullet list): Provide 4-5 concrete scenarios where expert reviewers SHOULD deviate from community norms (e.g., 'When you spot a methodological flaw that's technically correct but contextually inappropriate', 'When your domain expertise reveals limitations invisible to generalists').\n\n3. **Confidence Anchors** (numbered list): For each concern in SPECIFIC_CONCERNS, write a 2-3 sentence reframe that validates why her expert judgment is trustworthy evidence (e.g., 'Your lower methodology rating reflects specialized knowledge of [domain]. This IS the community standard for experts in your area—trust that expertise.').\n\n4. **Permission Statement** (2-3 sentences): A direct, affirming statement that perfect alignment is neither possible nor desirable, and that her role as expert reviewer is to contribute her specific lens.\n\nUse a supportive, authoritative tone. Focus on concrete evidence from her draft rather than generic encouragement. The document should be scannable and re-readable before submitting reviews.
  `,
  user_inputs: [
    {placeholder_name: 'REVIEW_DRAFT', description: 'The current review draft or notes that Dora has written'}, {placeholder_name: 'SPECIFIC_CONCERNS', description: "Specific areas where Dora feels uncertain about alignment with community standards (e.g., 'I rated methodology lower than typical CHI reviews might' or 'My expertise suggests flaws others might miss')"}],
}]

export default function Home({ userName }: HomeProps) {
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [solutionIds, setSolutionIds] = useState<number[]>([]);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);
  const [useInsights, setUseInsights] = useState(true);
  const [selectedInsights, setSelectedInsights] = useState<string[]>([]);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen for inferred actions from the main process
  useEffect(() => {
    const handleInferredActions = (_event: any, content: string) => {
      setQuery(content);
    };

    window.ipcRenderer?.on('inferred-actions', handleInferredActions);

    return () => {
      window.ipcRenderer?.off('inferred-actions', handleInferredActions);
    };
  }, []);

  // Auto-resize textarea when query changes programmatically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [query]);

  
  const handleSubmit = async () => {
    if (query.trim() && !isLoading) {
      setIsLoading(true);
      setError(null);
      setResponse(null);

      let insights: string[] = []
      let insightIds: number[] = []
      try {
        if (useInsights) {
          console.log("Getting relevant insights", query);
          const relevantInsights = await window.electronAPI?.getRelevantInsights(query);
          insights = relevantInsights.insights;
          setSelectedInsights(insights);
          insightIds = relevantInsights.insightIds;
          console.log("Relevant Insights: ", relevantInsights);
        }
        const prompt = make_solution({
          user_name: userName || 'User',
          scenario: query,
          insights: insights,
          limit: SOLUTION_LIMIT,
        }, useInsights);
        const result = await window.electronAPI?.callLLM(prompt, SOLUTION_MODEL);

        console.log(result);
        if (result?.success && result.content) {

          const parsedJSON = parseModelJson(result.content);

          // function saveSolutions({ request, model, use_insights, solutions }: { request: string; model: string; use_insights: boolean; solutions: { name: string; description: string; user_inputs: string; execution_prompt: string }[] }) {


          
          let fmtSolutions = parsedJSON.map((solution: any) => ({
            solution: {
              name: solution.name,
              description: solution.description,
            },
            agent_prompt: solution.execution_prompt,
            user_inputs: solution.user_inputs,
          }));

          let ids: number[] = await window.electronAPI?.saveSolutions({
            request: query,
            model: SOLUTION_MODEL,
            use_insights: useInsights,
            insight_ids: insightIds,
            solutions: fmtSolutions,
          });
          console.log(ids);
          
          fmtSolutions.forEach((solution: Solution, index: number) => {
            solution.id = ids[index];
          });
          setSolutions(fmtSolutions);
          setSolutionIds(ids);
          setLastQuery(query); // Store the query before clearing
        } else {
          setError(result?.error || 'Failed to get response from API');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while calling the API');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // const handleRefresh = async () => {
  //   if (lastQuery.trim() && !isLoading) {
  //     setIsLoading(true);
  //     setError(null);
  //     setResponse(null);
      
  //     try {
  //       const prompt = make_solution({
  //         user_name: userName || 'User',
  //         scenario: lastQuery,
  //         limit: SOLUTION_LIMIT,
  //       }, useInsights);
  //       const result = await window.electronAPI?.callLLM(prompt, SOLUTION_MODEL);

  //       if (result?.success && result.content) {
  //         const parsedJSON = JSON.parse(result.content);
  //         let fmtSolutions = parsedJSON.map((solution: any) => ({
  //           solution: {
  //             name: solution.name,
  //             description: solution.description,
  //           },
  //           agent_prompt: solution.execution_prompt,
  //           user_inputs: solution.user_inputs,
  //         }));

  //         setSolutions(fmtSolutions);
  //       } else {
  //         setError(result?.error || 'Failed to get response from API');
  //       }
  //     } catch (err: any) {
  //       setError(err.message || 'An error occurred while calling the API');
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  // };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-card">
          <h1 className="home-title">
            Hey there, {userName || 'User'}
          </h1>
        </div>
        <div className="home-action-container">
            {/* <h4 className="home-subtitle">
                We need a bit more to work with.<br/>
                Record a few sessions to unlock insights.
            </h4> */}
            <div className="home-input-wrapper">
              <textarea
                ref={textareaRef}
                placeholder="What can I help you with?"
                value={query}
                onChange={handleTextareaChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyPress}
                className={`home-input ${isFocused ? 'focused' : ''}`}
                rows={1}
              />
              <Button
                onClick={handleSubmit}
                className="home-submit-button"
                disabled={!query.trim() || isLoading}
                loading={isLoading}
                variant="filled"
                size="sm"
                style={{ padding: 0 }}
              >
                <IconArrowUp size={20} stroke={2} />
              </Button>
            </div>
            <div className="home-insights-toggle">
              <Switch
                label="Use insights"
                checked={useInsights}
                onChange={(e) => setUseInsights(e.currentTarget.checked)}
                size="sm"
                className="home-insights-switch"
              />
            </div>
            {useInsights && selectedInsights.length > 0 && (
              <div className="home-insights-box">
                <button
                  className="home-insights-header"
                  onClick={() => setIsInsightsOpen(!isInsightsOpen)}
                >
                  <span className="home-insights-title">
                    Selected Insights ({selectedInsights.length})
                  </span>
                  {isInsightsOpen ? (
                    <IconChevronUp size={20} />
                  ) : (
                    <IconChevronDown size={20} />
                  )}
                </button>
                {isInsightsOpen && (
                  <div className="home-insights-content">
                    {selectedInsights.map((insight, index) => (
                      <div key={index} className="home-insight-item">
                        {insight}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {!useInsights && response && (
              <div className="home-response">
                {response}
              </div>
            )}
            {error && (
              <div className="home-error">
                {error}
              </div>
            )}
            {response}
            {solutions.length > 0 && (
              <div className="home-response">
                <div className="home-section-header">
                  <h3 className="home-section-title">Which of the following do you want me to do?</h3>
                  <Button
                    onClick={handleSubmit}
                    className="home-refresh-button"
                    disabled={isLoading || !lastQuery.trim()}
                    variant="subtle"
                    size="sm"
                    title="Refresh"
                  >
                    <IconRefresh size={18} stroke={2} />
                  </Button>
                </div>
                {solutions.map((solution, index) => (
                  <div 
                    key={index} 
                    className="home-solution-item"
                    onClick={() => setSelectedSolution(solution)}
                  >
                    <h3>{solution.solution.name}</h3>
                    <p>{solution.solution.description}</p>
                  </div>
                ))}
              </div>
              
            )}
        </div>
      </div>
      
      <SidePanel 
        solution={selectedSolution} 
        onClose={() => setSelectedSolution(null)} 
      />
    </div>
  );
}

