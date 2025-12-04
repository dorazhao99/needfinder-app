import { useState } from 'react'
import { 
  Container, 
  Card, 
  Title, 
  Text, 
  TextInput, 
  Button, 
  Group, 
  Stack,
  Paper,
  Box
} from '@mantine/core'
import './welcome.css'

interface WelcomeProps {
  onComplete: () => void
}

export default function Welcome({ onComplete }: WelcomeProps) {
  const [name, setName] = useState<string>('')
  const [nameError, setNameError] = useState<string>('')
  const [selectedDirectory, setSelectedDirectory] = useState<string>('')

  const handleSelectDirectory = async () => {
    const directory = await window.electronAPI.selectDirectory()
    if (directory) {
      setSelectedDirectory(directory)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate name
    if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters')
      return
    }
    
    if (!selectedDirectory) {
      setNameError('Please select a directory')
      return
    }

    setNameError('')

    const success = await window.electronAPI.savePreferences({
      name: name.trim(),
      screenshotDirectory: selectedDirectory,
    })

    if (success) {
      onComplete()
    }
  }

  return (
    <Box className="welcome-container">
      <div className="welcome-background"></div>
      <Container size="sm" className="welcome-content">
        <Stack gap={48} align="stretch">
          <div className="welcome-header">
            <Title 
              order={1} 
              className="welcome-title"
            >
              Welcome to Lilac
            </Title>
            <Text 
              className="welcome-subtitle"
            >
              Let's get you set up in just a moment
            </Text>
          </div>

          <Card 
            className="welcome-card"
            padding={32}
            radius={20}
            withBorder={false}
          >
            <form onSubmit={handleSubmit}>
              <Stack gap={24}>
                <div className="welcome-form-group">
                  <Text className="welcome-label" mb={8}>
                    What's your name?
                  </Text>
                  <TextInput
                    placeholder="Enter your name"
                    size="md"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.currentTarget.value)
                      if (nameError) setNameError('')
                    }}
                    error={nameError}
                    className="welcome-input"
                    styles={{
                      input: { 
                        fontSize: '15px',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:focus': {
                          borderColor: 'rgba(0, 122, 255, 0.5)',
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          boxShadow: '0 0 0 3px rgba(0, 122, 255, 0.1)',
                        }
                      }
                    }}
                  />
                </div>

                <div className="welcome-form-group">
                  <Text className="welcome-label" mb={8}>
                    Screenshot Directory
                  </Text>
                  <Paper 
                    className="welcome-directory-picker"
                    p={12}
                    radius={8}
                    onClick={handleSelectDirectory}
                  >
                    <Group justify="space-between" gap={12}>
                      <Text 
                        className="welcome-directory-text"
                        c={selectedDirectory ? 'dark' : 'dimmed'}
                      >
                        {selectedDirectory || 'Click to select a directory...'}
                      </Text>
                      <Button 
                        variant="light"
                        size="sm"
                        radius={6}
                        className="welcome-browse-button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectDirectory()
                        }}
                        styles={{
                          root: {
                            fontWeight: 500,
                            fontSize: '13px',
                            padding: '6px 14px',
                            backgroundColor: 'rgba(0, 122, 255, 0.1)',
                            color: '#007AFF',
                            border: 'none',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 122, 255, 0.15)',
                            }
                          }
                        }}
                      >
                        Browse
                      </Button>
                    </Group>
                  </Paper>
                  {!selectedDirectory && (
                    <Text className="welcome-error-text" mt={6}>
                      Please select a directory to save screenshots
                    </Text>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  mt={8}
                  disabled={!selectedDirectory}
                  className="welcome-submit-button"
                  radius={10}
                  styles={{
                    root: {
                      fontWeight: 600,
                      fontSize: '15px',
                      padding: '12px 24px',
                      backgroundColor: '#007AFF',
                      border: 'none',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover:not(:disabled)': {
                        backgroundColor: '#0051D5',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                      },
                      '&:active:not(:disabled)': {
                        transform: 'translateY(0)',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        color: 'rgba(0, 0, 0, 0.3)',
                        cursor: 'not-allowed',
                      }
                    }
                  }}
                >
                  Get Started
                </Button>
              </Stack>
            </form>
          </Card>
        </Stack>
      </Container>
    </Box>
  )
}

