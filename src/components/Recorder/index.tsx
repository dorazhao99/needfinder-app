import { useState, useEffect } from 'react';
import { IconPlayerPlay, IconPlayerPause, IconPlayerStop } from '@tabler/icons-react';
import RecordingPopup from '../RecordingPopup';
import './recorder.css';

export default function Recorder() {
  const [recordingState, setRecordingState] = useState('idle'); // 'idle', 'recording', 'paused'
  const [duration, setDuration] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingState === 'recording') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingState]);

  useEffect(() => {
    // Get initial state
    window.electronAPI?.getRecordingState().then((state: boolean) => {
      console.log('Initial recording state:', state);
      setRecordingState(state ? 'recording' : 'idle');
    });

    // Listen for recording state changes
    const handleRecordingStateChanged = (_event: Electron.IpcRendererEvent, isRecording: boolean) => {
      console.log('Recording state changed:', isRecording);
      if (isRecording) {
        setRecordingState('recording');
      } else {
        // If we were recording and now it's false, it means paused
        // Otherwise it's idle
        setRecordingState(prev => prev === 'recording' ? 'paused' : 'idle');
      }
    };

    window.ipcRenderer?.on('recording-state-changed', handleRecordingStateChanged);

    // Cleanup listener on unmount
    return () => {
      window.ipcRenderer?.off('recording-state-changed', handleRecordingStateChanged);
    };
  }, []);


  const handleStartRecording = () => {
    setRecordingState('recording');
    setShowPopup(true);
    if (window.electronAPI?.runPython) {
      window.electronAPI.runPython();
    } 
    if (window.electronAPI?.toggleRecording) {
      window.electronAPI.toggleRecording();
    }
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
    if (window.electronAPI?.stopPython) {
      window.electronAPI.stopPython();
      if (window.electronAPI?.toggleRecording) {
        window.electronAPI.toggleRecording();
      }
    }
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
    if (window.electronAPI?.runPython) {
      window.electronAPI.runPython();
      if (window.electronAPI?.toggleRecording) {
        window.electronAPI.toggleRecording();
      }
    }
  };


  return (
    <>
      <RecordingPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
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
    </>
  );
}