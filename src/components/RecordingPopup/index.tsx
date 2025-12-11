import { IconX, IconPlayerRecord, IconSettings } from '@tabler/icons-react';
import './recording-popup.css';

interface RecordingPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RecordingPopup({ isOpen, onClose }: RecordingPopupProps) {
  const handleOpenSystemSettings = () => {
    if (window.electronAPI?.openSystemSettings) {
      window.electronAPI.openSystemSettings();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="recording-popup-overlay" onClick={onClose}>
      <div className="recording-popup" onClick={(e) => e.stopPropagation()}>
        <button className="recording-popup-close" onClick={onClose}>
          <IconX size={20} />
        </button>
        
        <div className="recording-popup-content">
          <div className="recording-popup-icon">
            <IconPlayerRecord size={32} />
          </div>
          
          <h2 className="recording-popup-title">Screen Recording Permission Required</h2>
          
          <p className="recording-popup-message">
            To start recording, please grant Terminal screen recording permissions in System Settings.
          </p>
          
          <div className="recording-popup-steps">
            <div className="recording-popup-step">
              <span className="step-number">1</span>
              <span className="step-text">Click the button below to open System Settings</span>
            </div>
            <div className="recording-popup-step">
              <span className="step-number">2</span>
              <span className="step-text">Navigate to Privacy & Security → Screen Recording</span>
            </div>
            <div className="recording-popup-step">
              <span className="step-number">3</span>
              <span className="step-text">Enable Terminal in the list of allowed apps</span>
            </div>
          </div>
          
          <button 
            className="recording-popup-button"
            onClick={handleOpenSystemSettings}
          >
            <IconSettings size={18} />
            <span>Open System Settings</span>
          </button>
          
          <button 
            className="recording-popup-button-secondary"
            onClick={onClose}
          >
            I've enabled permissions
          </button>
        </div>
      </div>
    </div>
  );
}

