import { useEffect, useState, useRef } from 'react'
import { Button, TextInput } from '@mantine/core'
import './overlay.css'

export default function Overlay() {
  const [isCallActive, setIsCallActive] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const [annotation, setAnnotation] = useState<string>('')
  const [isSaved, setIsSaved] = useState(false)
  const progressBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Listen for call status updates from main process
    const handleCallStatus = (_event: Electron.IpcRendererEvent, status: boolean) => {
      setIsCallActive(status)
    }

    // Register listener if electronAPI is available
    if (window.electronAPI) {
      window.electronAPI.onCallStatus?.(handleCallStatus)
    }

    return () => {
      // Cleanup listener if needed
      if (window.electronAPI?.removeCallStatusListener) {
        window.electronAPI.removeCallStatusListener(handleCallStatus)
      }
    }
  }, [])

  // Pause timeout when overlay is focused/interacted with
  const pauseTimeout = () => {
    if (!isPaused) {
      setIsPaused(true)
      if (window.electronAPI?.pauseOverlayTimeout) {
        window.electronAPI.pauseOverlayTimeout()
      }
      // Pause progress bar animation
      if (progressBarRef.current) {
        progressBarRef.current.style.animationPlayState = 'paused'
      }
    }
  }

  // Resume timeout when overlay loses focus
  const resumeTimeout = () => {
    if (isPaused) {
      setIsPaused(false)
      if (window.electronAPI?.resumeOverlayTimeout) {
        window.electronAPI.resumeOverlayTimeout()
      }
      // Resume progress bar animation
      if (progressBarRef.current) {
        progressBarRef.current.style.animationPlayState = 'running'
      }
    }
  }

  // Set up focus/blur listeners to pause/resume timeout
  useEffect(() => {
    const handleFocus = () => {
      pauseTimeout()
    }

    const handleBlur = () => {
      resumeTimeout()
    }

    // Listen for window focus/blur events
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Also pause on any interaction (typing, clicking)
    const handleInteraction = () => {
      pauseTimeout()
    }

    const interactionEvents = ['mousedown', 'keydown', 'input']
    interactionEvents.forEach(event => {
      window.addEventListener(event, handleInteraction)
    })

    // Initially pause if window is focused
    if (document.hasFocus()) {
      pauseTimeout()
    }

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleInteraction)
      })
    }
  }, [isPaused])

  // Handle input interactions directly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value)
    pauseTimeout()
  }

  const handleInputFocus = () => {
    pauseTimeout()
  }

  const handleClose = () => {
    if (window.electronAPI?.closeOverlay) {
      window.electronAPI.closeOverlay()
    }
  }

  const handleSave = () => {
    if (userInput.trim()) {
      setAnnotation(userInput.trim())
      console.log('Annotation saved:', userInput.trim())
      handleClose()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <div className="overlay-container">
      <button 
        className="overlay-close-button"
        onClick={handleClose}
        aria-label="Close overlay"
      >
        <svg width="6" height="6" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      <div className="overlay-content">
        <div className="overlay-card">
          <div className="overlay-header">
            <div className="overlay-title">Meeting detected</div>
          </div>
          <div className="overlay-input-container">
            <div className="overlay-input-wrapper">
              <TextInput
                placeholder="What are you working on?"
                value={userInput}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyPress={handleKeyPress}
                size="sm"
                className="overlay-input"
              />
              <Button
                onClick={handleSave}
                size="sm"
                className="overlay-enter-button"
                disabled={!userInput.trim()}
              >
                Enter
              </Button>
            </div>
          </div>
          <div className="overlay-progress-container">
            <div ref={progressBarRef} className="overlay-progress-bar"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

