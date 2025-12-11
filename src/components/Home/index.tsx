import { useState } from 'react';
import {Button} from '@mantine/core';
import { IconArrowUp, IconRefresh } from '@tabler/icons-react';
import SidePanel, { Solution } from '@/components/SidePanel';
import { make_solution } from '@/prompts';
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
  const [solutions, setSolutions] = useState(testCase);
  const [selectedSolution, setSelectedSolution] = useState<Solution | null>(null);

  
  const handleSubmit = async () => {
    if (query.trim() && !isLoading) {
      setIsLoading(true);
      setError(null);
      setResponse(null);
      
      try {
        const prompt = make_solution({
          user_name: userName,
          scenario: query,
        });
        const result = await window.electronAPI?.callLLM(prompt, 'gpt-4.1-mini');

        console.log(prompt);
        if (result?.success && result.content) {
          const parsedJSON = JSON.parse(result.content);
          let fmtSolutions = parsedJSON.map((solution: any) => ({
            solution: {
              name: solution.name,
              description: solution.description,
            },
            agent_prompt: solution.execution_prompt,
            user_inputs: solution.user_inputs,
          }));
          console.log(fmtSolutions);

          setSolutions(fmtSolutions);
          setLastQuery(query); // Store the query before clearing
          setQuery(''); // Clear input after successful submission
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleRefresh = async () => {
    if (lastQuery.trim() && !isLoading) {
      setIsLoading(true);
      setError(null);
      setResponse(null);
      
      try {
        const prompt = make_solution({
          user_name: userName,
          scenario: lastQuery,
        });
        const result = await window.electronAPI?.callLLM(prompt, 'gpt-4.1-mini');

        if (result?.success && result.content) {
          const parsedJSON = JSON.parse(result.content);
          let fmtSolutions = parsedJSON.map((solution: any) => ({
            solution: {
              name: solution.name,
              description: solution.description,
            },
            agent_prompt: solution.execution_prompt,
            user_inputs: solution.user_inputs,
          }));

          setSolutions(fmtSolutions);
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
              <input
                type="text"
                placeholder="What can I help you with?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyPress={handleKeyPress}
                className={`home-input ${isFocused ? 'focused' : ''}`}
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
            {response && (
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
                    onClick={handleRefresh}
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

