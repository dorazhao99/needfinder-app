import { useState, useEffect, useRef } from 'react';
import { IconX, IconAlertTriangle, IconLoader2 } from '@tabler/icons-react';
import './settings.css';

interface SettingsProps {
  onPageChange?: (page: string) => void;
}

interface TerminalMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'system';
}

export default function Settings({ onPageChange }: SettingsProps) {
  const [name, setName] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [isFocused, setIsFocused] = useState({ name: false, directory: false });
  const [processingInsights, setProcessingInsights] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [terminalMessages, setTerminalMessages] = useState<TerminalMessage[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load current preferences
    window.electronAPI?.getUser().then((user) => {
      if (user) {
        setName(user.name);
        setSelectedDirectory(user.file_dir);
      }
    });
  }, []);

  // Listen for preprocessing events
  useEffect(() => {
    const handlePreprocessComplete = () => {
      const timestamp = new Date().toLocaleTimeString();
      setTerminalMessages(prev => [...prev, {
        timestamp,
        message: `✓ Preprocessing completed successfully.`,
        type: 'success'
      }]);
    };

    const handlePreprocessError = (_event: Electron.IpcRendererEvent, errorMessage: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setTerminalMessages(prev => [...prev, {
        timestamp,
        message: `✗ Preprocessing error: ${errorMessage}`,
        type: 'error'
      }]);
    };

    if (window.ipcRenderer) {
      window.ipcRenderer.on('preprocess-complete', handlePreprocessComplete);
      window.ipcRenderer.on('preprocess-error', handlePreprocessError);
      
      return () => {
        window.ipcRenderer.off('preprocess-complete', handlePreprocessComplete);
        window.ipcRenderer.off('preprocess-error', handlePreprocessError);
      };
    }
  }, []);

  // Auto-scroll terminal to bottom when new messages arrive
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalMessages]);

  const handleSelectDirectory = async () => {
    const directory = await window.electronAPI?.selectDirectory();
    if (directory) {
      setSelectedDirectory(directory);
    }
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      return;
    }
    
    if (!selectedDirectory) {
      return;
    }

    const success = await window.electronAPI?.saveUser({ 
      name, 
      file_dir: selectedDirectory 
    });
    
    if (success) {
      // Show success message or handle accordingly
      console.log('Settings saved successfully');
    }
  };

  const handleProcessInsightsClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmProcess = async () => {
    setShowConfirmation(false);
    setProcessingInsights(true);
    setError(null); // Clear any previous errors
    setSuccess(false); // Clear any previous success
    setTerminalMessages([]); // Clear previous terminal messages
    
    const timestamp = new Date().toLocaleTimeString();
    setTerminalMessages(prev => [...prev, {
      timestamp,
      message: 'Starting preprocessing...',
      type: 'system'
    }]);
    
    console.log('Processing insights');
    const response = await window.electronAPI?.processInsights(name);
    if (response.success) {
      console.log('Insights processed successfully');
      setSuccess(true);
      const successTimestamp = new Date().toLocaleTimeString();
      setTerminalMessages(prev => [...prev, {
        timestamp: successTimestamp,
        message: '✓ Insights processed successfully',
        type: 'success'
      }]);
    } else {
      console.error('Error processing insights');
      setError(response.message || 'An error occurred while processing insights');
      const errorTimestamp = new Date().toLocaleTimeString();
      setTerminalMessages(prev => [...prev, {
        timestamp: errorTimestamp,
        message: `✗ Error: ${response.message || 'An error occurred while processing insights'}`,
        type: 'error'
      }]);
    }
    setProcessingInsights(false);
  };

  const handleCancelProcess = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="settings-container">
      {/* Animated Background Orbs */}
      <div className="settings-orb settings-orb-1"></div>
      <div className="settings-orb settings-orb-2"></div>
      <div className="settings-orb settings-orb-3"></div>
      
      <div className="settings-content">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
        </div>

        <div className="settings-card">
          <div className="settings-form-group">
            <label className="settings-label">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setIsFocused({ ...isFocused, name: true })}
              onBlur={() => setIsFocused({ ...isFocused, name: false })}
              className={`settings-input ${isFocused.name ? 'focused' : ''}`}
            />
          </div>

          <div className="settings-form-group">
            <label className="settings-label">Screenshot Directory</label>
            <div
              onClick={handleSelectDirectory}
              onFocus={() => setIsFocused({ ...isFocused, directory: true })}
              onBlur={() => setIsFocused({ ...isFocused, directory: false })}
              tabIndex={0}
              className={`settings-directory-picker ${isFocused.directory ? 'focused' : ''}`}
            >
              <span className={`settings-directory-text ${selectedDirectory ? 'selected' : ''}`}>
                {selectedDirectory || 'Click to select a directory...'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectDirectory();
                }}
                className="settings-browse-button"
              >
                Browse
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedDirectory || name.length < 2}
            className={`settings-save-button ${selectedDirectory && name.length >= 2 ? 'enabled' : 'disabled'}`}
          >
            Save Changes
          </button>
        </div>
        <button
            type="button"
            onClick={handleProcessInsightsClick}
            disabled={processingInsights || !selectedDirectory || name.length < 2}
            className={`settings-save-button ${selectedDirectory && name.length >= 2 && !processingInsights ? 'enabled' : 'disabled'}`}
          >
            {processingInsights ? (
              <>
                <IconLoader2 size={18} className="settings-loading-icon" />
                Processing...
              </>
            ) : (
              'Process Insights'
            )}
        </button>
        
        {/* Terminal Interface */}
        {(terminalMessages.length > 0 || processingInsights) && (
          <div className="settings-terminal-container">
            <div className="settings-terminal-header">
              <div className="settings-terminal-title">Processing Log</div>
              <button
                type="button"
                onClick={() => setTerminalMessages([])}
                className="settings-terminal-clear"
                title="Clear log"
              >
                <IconX size={16} />
              </button>
            </div>
            <div className="settings-terminal" ref={terminalRef}>
              {terminalMessages.length === 0 && processingInsights && (
                <div className="settings-terminal-line">
                  <span className="settings-terminal-prompt">$</span>
                  <span className="settings-terminal-text">Waiting for preprocessing to start...</span>
                </div>
              )}
              {terminalMessages.map((msg, index) => (
                <div key={index} className={`settings-terminal-line settings-terminal-line-${msg.type}`}>
                  <span className="settings-terminal-timestamp">[{msg.timestamp}]</span>
                  <span className="settings-terminal-prompt">$</span>
                  <span className="settings-terminal-text">{msg.message}</span>
                </div>
              ))}
              {processingInsights && (
                <div className="settings-terminal-line">
                  <span className="settings-terminal-prompt">$</span>
                  <span className="settings-terminal-text settings-terminal-cursor">_</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {
          error && error.length > 0 && (
            <div className="settings-error-message">
              <IconAlertTriangle size={20} />
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="settings-error-close"
              >
                <IconX size={16} />
              </button>
            </div>
          )
        }
      </div>

      {/* Confirmation Popup */}
      {showConfirmation && (
        <div className="settings-confirmation-overlay" onClick={handleCancelProcess}>
          <div className="settings-confirmation-popup" onClick={(e) => e.stopPropagation()}>
            <button className="settings-confirmation-close" onClick={handleCancelProcess}>
              <IconX size={20} />
            </button>
            
            <div className="settings-confirmation-content">
              <div className="settings-confirmation-icon">
                <IconAlertTriangle size={32} />
              </div>
              
              <h2 className="settings-confirmation-title">Review Screenshots Before Processing</h2>
              
              <p className="settings-confirmation-message">
                Please review all screenshots saved in the directory to remove any private or confidential information before proceeding with processing insights.
              </p>
              
              <div className="settings-confirmation-buttons">
                <button 
                  className="settings-confirmation-button-primary"
                  onClick={handleConfirmProcess}
                >
                  Proceed
                </button>
                
                <button 
                  className="settings-confirmation-button-secondary"
                  onClick={handleCancelProcess}
                >
                  Cancel
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

