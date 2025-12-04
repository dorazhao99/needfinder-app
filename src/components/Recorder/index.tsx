import { useState, useEffect } from 'react';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop } from '@tabler/icons-react';
import './recorder.css';

export default function Recorder() {
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'paused'
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);


  const handleStartRecording = () => {
    setRecordingState('recording');
    if (window.electronAPI?.runPython) {
      window.electronAPI.runPython();
    }
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
    if (window.electronAPI?.stopPython) {
      window.electronAPI.stopPython();
    }
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
    if (window.electronAPI?.runPython) {
      window.electronAPI.runPython();
    }
  };

  const handleStopRecording = () => {
    setRecordingState('idle');
    setDuration(0);
    if (window.electronAPI?.stopPython) {
      window.electronAPI.stopPython();
    }
  };

  return (
    <div className="recorder-container">
      <div className="recorder-content">
        {/* Main Card */}
        <div className="recorder-card">
          {/* Header */}
          <div className="recorder-header">
            <h1 className="recorder-title">Screen Recorder</h1>
            <p className="recorder-subtitle">Capture your workflow seamlessly</p>
          </div>

          {/* Ambient Recording Indicator */}
          <div className="indicator-container">
            <div className="indicator-wrapper">
              {recordingState === 'recording' && (
                <>
                  <div className="indicator-glow"></div>
                  <div className="indicator-outer recording">
                    <div className="indicator-inner">
                      <div className="indicator-dot"></div>
                    </div>
                  </div>
                </>
              )}
              {recordingState === 'paused' && (
                <div className="indicator-outer paused">
                  <div className="indicator-inner">
                    <div className="pause-bars">
                      <div className="pause-bar"></div>
                      <div className="pause-bar"></div>
                    </div>
                  </div>
                </div>
              )}
              {recordingState === 'idle' && (
                <div className="indicator-outer idle">
                  <div className="indicator-inner"></div>
                </div>
              )}
            </div>
          </div>

          {/* Status Display */}
          <div className="status-display">
            <div className="status-text">
              {recordingState === 'recording' && 'Capturing'}
              {recordingState === 'paused' && 'On Hold'}
              {recordingState === 'idle' && 'Ready'}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="controls">
            {recordingState === 'idle' && (
              <button
                onClick={handleStartRecording}
                className="btn btn-primary"
              >
                <IconPlayerPlay className="btn-icon" fill="white" />
                <span>Begin Capture</span>
              </button>
            )}

            {recordingState === 'recording' && (
              <button
                onClick={handlePauseRecording}
                className="btn btn-pause"
              >
                <IconPlayerPause className="btn-icon" fill="white" />
                <span>Pause</span>
              </button>
            )}

            {recordingState === 'paused' && (
              <button
                onClick={handleResumeRecording}
                className="btn btn-primary"
              >
                <IconPlayerPlay className="btn-icon" fill="white" />
                <span>Continue</span>
              </button>
            )}
          </div>

          {/* Ambient Status */}
          {recordingState === 'recording' && (
            <div className="background-status">
              <div className="background-status-badge">
                <div className="background-status-dot"></div>
                <span className="background-status-text">Capturing in background</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}