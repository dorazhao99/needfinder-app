import { useState, useEffect } from 'react';
import { Paper, Loader, Center, Badge, Text, Group, Stack } from '@mantine/core';
import './history.css';

interface Solution {
  id: number;
  name: string;
  description: string;
  user_inputs: string;
  execution_prompt: string;
  model: string;
  created_at: string;
  updated_at: string;
  request_id: number;
  selected: number; // SQLite returns 0/1 for boolean
  use_insights: number; // SQLite returns 0/1 for boolean
}

export default function History() {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI?.getAllSolutions();
      if (data) {
        setSolutions(data as Solution[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load solutions');
      console.error('Error loading solutions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatUserInputs = (userInputs: string) => {
    try {
      const parsed = JSON.parse(userInputs);
      if (Array.isArray(parsed)) {
        return parsed.map((input: any) => input.placeholder_name || input).join(', ');
      }
      return userInputs;
    } catch {
      return userInputs.substring(0, 50) + (userInputs.length > 50 ? '...' : '');
    }
  };

  if (loading) {
    return (
      <div className="history-container">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <Paper p="md" withBorder>
          <Text c="red">Error: {error}</Text>
        </Paper>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-content">
        <div className="history-card">
          <h1 className="history-title">History</h1>
        </div>
        <div className="history-action-container">
          {solutions.length === 0 ? (
            <div className="history-empty">
              <Text c="dimmed" style={{ textAlign: 'left' }}>No solutions found. Start by creating a solution in the Home view.</Text>
            </div>
          ) : (
            <div className="history-response">
              {solutions.map((solution) => (
                <div 
                  key={solution.id} 
                  className="history-solution-item"
                >
                  <div className="history-solution-header">
                    <Group gap="xs" mb="xs">
                      <Text size="sm" c="dimmed" className="history-card-id">
                        #{solution.id}
                      </Text>
                      <Badge 
                        variant="light" 
                        className="history-badge-model"
                      >
                        {solution.model}
                      </Badge>
                      <Badge 
                        variant="light" 
                        className="history-badge-model"
                      >
                        {solution.use_insights ? 'w/ Insights' : 'No Insights'}
                      </Badge>
                      {solution.selected ? (
                        <Badge color="green" className="history-badge-selected">
                          Selected
                        </Badge>
                      ) : (
                        <Badge color="gray" variant="light" className="history-badge-unselected">
                          Not Selected
                        </Badge>
                      )}
                    </Group>
                  </div>
                  <h3>{solution.name}</h3>
                  <p>{solution.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
