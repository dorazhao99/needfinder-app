import { useState, useEffect } from 'react';
import './settings.css';

interface SettingsProps {
  onPageChange?: (page: string) => void;
}

export default function Settings({ onPageChange }: SettingsProps) {
  const [name, setName] = useState('');
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [isFocused, setIsFocused] = useState({ name: false, directory: false });

  useEffect(() => {
    // Load current preferences
    window.electronAPI?.getUser().then((user) => {
      if (user) {
        setName(user.name);
        setSelectedDirectory(user.file_dir);
      }
    });
  }, []);

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

  return (
    <div className="settings-container">
      {/* Animated Background Orbs */}
      <div className="settings-orb settings-orb-1"></div>
      <div className="settings-orb settings-orb-2"></div>
      <div className="settings-orb settings-orb-3"></div>
      
      <div className="settings-content">
        <div className="settings-header">
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your preferences</p>
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
      </div>
    </div>
  );
}

