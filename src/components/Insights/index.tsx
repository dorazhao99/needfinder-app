import { useState, useEffect } from 'react';
import { Loader, Center, Text } from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import './insights.css';

interface Insight {
  id: number;
  title: string;
  tagline: string;
  description: string;
  context: string;
  supporting_evidence: string;
  metainsight: number; // SQLite returns 0/1 for boolean
}

export default function Insights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI?.getMergedInsights();
      if (data) {
        setInsights(data as Insight[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
      console.error('Error loading insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (insightId: number) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="insights-container">
        <Center h={400}>
          <Loader size="lg" />
        </Center>
      </div>
    );
  }

  if (error) {
    return (
      <div className="insights-container">
        <div className="insights-content">
          <div className="insights-error">
            <Text c="red">Error: {error}</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="insights-container">
      <div className="insights-content">
        <div className="insights-card">
          <h1 className="insights-title">Insights</h1>
        </div>
        <div className="insights-action-container">
          {insights.length === 0 ? (
            <div className="insights-empty">
              <Text c="dimmed" style={{ textAlign: 'left' }}>
                No insights found. Insights will appear here once they are generated.
              </Text>
            </div>
          ) : (
            <div className="insights-grid">
              {insights.map((insight) => {
                const isExpanded = expandedCards.has(insight.id);
                return (
                  <div key={insight.id} className="insights-card-item">
                    <div className="insights-card-header">
                      <div className="insights-card-content">
                        <h3 className="insights-card-title">{insight.title}</h3>
                        <p className="insights-card-tagline">{insight.tagline}</p>
                      </div>
                      <button
                        className="insights-card-expand-button"
                        onClick={() => toggleCard(insight.id)}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <IconChevronUp size={20} />
                        ) : (
                          <IconChevronDown size={20} />
                        )}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="insights-card-description-wrapper">
                        <p className="insights-card-description">{insight.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

