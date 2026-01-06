import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Textarea, Button } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import './side-panel.css';
import { replacePlaceholders, isEmptyString } from '@/utils';

export interface Solution {
  id: number;
  solution: {
    name: string;
    description: string;
  };
  agent_prompt?: string;
  user_inputs?: Array<{
    placeholder_name: string;
    description: string;
  }>;
}

interface SidePanelProps {
  solution: Solution | null;
  onClose: () => void;
}

export default function SidePanel({ solution, onClose }: SidePanelProps) {
  if (!solution) return null;

  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [artifacts, setArtifacts] = useState<string[] | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const handleInputChange = (key: string, value: string) => {
    console.log(inputValues);
    setInputValues((prev) => ({ ...prev, [key]: value }));
  };


  const handleSubmit = async() => {
    setLoading(true);
    setError(null);
    setResponse(null);
    window.electronAPI?.selectSolution(solution.id);

    try {
      console.log(inputValues);
      if (!solution.agent_prompt) {
        setError("Agent prompt is missing.");
        return;
      }
      const result = replacePlaceholders(solution.agent_prompt, inputValues);
      console.log(result);
      const response = await window.electronAPI.callAgent(result, solution.id);
      
      if (response.success) {
        if (response.message) {
          setResponse(response.message.message);
          const artifactUri = response.message?.artifact_uri || '';
          const isArtifact = isEmptyString(artifactUri);
          if (isArtifact) {
            setArtifacts([artifactUri]);
          }
        } else {
          setError("Sorry, something went wrong.");
        }
      } else {
        setError(response.error || "Sorry, something went wrong.");
      }
      console.log(response);
    } finally {
      setLoading(false);
    }
  };
  return createPortal(
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <h2>{solution.solution.name}</h2>
          <button 
            className="side-panel-close"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="side-panel-content">
          <div className="side-panel-section">
            <h3>Description</h3>
            <p>{solution.solution.description}</p>
          </div>
          {/* {solution.agent_prompt && (
            <div className="side-panel-section">
              <h3>Agent Prompt</h3>
              <pre className="side-panel-code">{solution.agent_prompt}</pre>
            </div>
          )} */}
          {solution.user_inputs && solution.user_inputs.length > 0 && (
            <div className="side-panel-section">
              <h3>User Inputs</h3>
                {solution.user_inputs.map((input, idx) => (
                  <Textarea
                    key={idx}
                    className="side-panel-textarea"
                    placeholder={input.description}
                    label={input.placeholder_name.split('_').map(word => word.toUpperCase()).join(' ')}
                    onChange={(e) => handleInputChange(input.placeholder_name, e.target.value)}
                  />
                ))} 
            </div>
          )}
          <Button onClick={handleSubmit} className="side-panel-submit-button" loading={loading} disabled={loading}>Execute</Button>
          {response && (
            <div className="side-panel-section side-panel-response">
              <h3>Response</h3>
              <div className="side-panel-response-content">{response}</div>
            </div>
          )}
          {error && (
            <div className="side-panel-section side-panel-error">
              <h3>Error</h3>
              <div className="side-panel-error-content">{error}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
