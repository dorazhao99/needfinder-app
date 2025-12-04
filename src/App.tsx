import { useState, useEffect } from 'react'
import { Button, Card, Container, Loader, Center } from '@mantine/core'

import UpdateElectron from '@/components/update'
import Welcome from '@/components/Welcome'
import './App.css'

function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  useEffect(() => {
    checkSetup()
  }, [])

  const checkSetup = async () => {
    const setupComplete = await window.electronAPI.checkSetup()
    setIsSetupComplete(setupComplete)
  }

  const handleStartRecording = () => {
    window.electronAPI.runPython()
    setIsRecording(true)
  }

  const pauseRecording = () => {
    window.electronAPI.stopPython()
    setIsRecording(false)
  }

  // Show loading state while checking setup
  if (isSetupComplete === null) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" />
      </Center>
    )
  }

  // Show welcome page if setup is not complete
  if (!isSetupComplete) {
    return <Welcome onComplete={checkSetup} />
  }

  // Show main app
  return (
    <Container size="md" py="xl">
      <div className='App'>
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="md">
          <Button
            onClick={handleStartRecording}
            color={"blue"}
            size="lg"
            fullWidth
          >
            {"▶ Play"}
          </Button>
          <Button
            onClick={pauseRecording}
            color={"red"}
            size="lg"
            fullWidth
          >
            {"⏸ Pause"}
          </Button>
        </Card>
      </div>
    </Container>
  )
}

export default App