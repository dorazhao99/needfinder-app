import { useState } from 'react'
import './welcome.css'

interface WelcomeProps {
  setIsSetupComplete: (isSetupComplete: boolean) => void
}

export default function Welcome({ setIsSetupComplete }: WelcomeProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [selectedDirectory, setSelectedDirectory] = useState('~/.cache/recordr/screenshots')
  const [isFocused, setIsFocused] = useState({ name: false, directory: false })

  const handleSelectDirectory = async () => {
    const directory = await window.electronAPI.selectDirectory()
    if (directory) {
      setSelectedDirectory(directory)
    }
  }

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
      return
    }
    
    if (!selectedDirectory) {
      setNameError('Please select a directory')
      return
    }

    setNameError('')
    window.electronAPI.saveUser({ name, file_dir: selectedDirectory }).then((resp) => {
        if (resp) {
            let success = resp?.success
            if (success) {
                setIsSetupComplete(true)
            } else {
                setNameError('Failed to save user')
            }
        }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="welcome-container">
      {/* Animated background elements */}
      <div className="welcome-orb welcome-orb-1" />
      <div className="welcome-orb welcome-orb-2" />
      <div className="welcome-orb welcome-orb-3" />

      <div className="welcome-content">
        {/* Header */}
        <div className="welcome-header">
          <div className="welcome-icon-wrapper">
            <div className="welcome-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
          </div>
          
          <h1 className="welcome-title">
            Welcome to Recordr
          </h1>
          <p className="welcome-subtitle">
            Let's personalize your experience
          </p>
        </div>

        {/* Main Card */}
        <div className="welcome-card">
          {/* Name Input */}
          <div className="welcome-form-group">
            <label className="welcome-label">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (nameError) setNameError('')
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setIsFocused({ ...isFocused, name: true })}
              onBlur={() => setIsFocused({ ...isFocused, name: false })}
              className={`welcome-input ${isFocused.name ? 'focused' : ''} ${nameError ? 'error' : ''}`}
            />
            {nameError && (
              <p className="welcome-error">
                {nameError}
              </p>
            )}
          </div>

          {/* Directory Picker */}
          <div className="welcome-form-group">
            <label className="welcome-label">
              Screenshot Directory
            </label>
            <div
              onClick={handleSelectDirectory}
              onFocus={() => setIsFocused({ ...isFocused, directory: true })}
              onBlur={() => setIsFocused({ ...isFocused, directory: false })}
              tabIndex={0}
              className={`welcome-directory-picker ${isFocused.directory ? 'focused' : ''}`}
            >
              <span className={`welcome-directory-text ${selectedDirectory ? 'selected' : ''}`}>
                {selectedDirectory || 'Click to select a directory...'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelectDirectory()
                }}
                className="welcome-browse-button"
              >
                Browse
              </button>
            </div>
            {!selectedDirectory && (
              <p className="welcome-helper-text">
                Choose where to save your screenshots
              </p>
            )}
          </div>

          {/* Consent Form
          <div className="welcome-form-group">
            <label className="welcome-label">
              Consent Form
            </label>
            <div className="welcome-consent-container">
              <div className="welcome-consent-textbox">
                <div className="welcome-consent-content">
                
                </div>
              </div>
              <label className="welcome-consent-checkbox">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => {
                    setConsentAccepted(e.target.checked)
                    if (nameError && e.target.checked) setNameError('')
                  }}
                />
                <span>I have read and accept the consent form</span>
              </label>
            </div>
          </div> */}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedDirectory || name.length < 1}
            className={`welcome-submit-button ${selectedDirectory ? 'shimmer enabled' : 'disabled'}`}
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  )
}