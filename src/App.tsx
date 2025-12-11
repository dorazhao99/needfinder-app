import { useState, useEffect } from 'react'
import { Button, Card, Container, Loader, Center } from '@mantine/core'

import UpdateElectron from '@/components/update'
import Welcome from '@/components/Welcome'
import Overlay from '@/components/Overlay'
import './App.css'
import { TitleBar } from './components/TitleBar'
import DefaultView from './components/DefaultView'

interface User {
  name: string
  file_dir: string
}
function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check if this is the overlay window
    const hash = window.location.hash
    if (hash === '#overlay') {
      return // Don't run setup check for overlay window
    }
    checkSetup()
  }, [])

  const checkSetup = async () => {
    const setupComplete = await window.electronAPI.getUser() 
    if (setupComplete == null) {
      setIsSetupComplete(false)
    } else {
      let selUser = {
        name: setupComplete.name,
        file_dir: setupComplete.file_dir,
      }
      setUser(selUser)
      setIsSetupComplete(true)
    }
  }

  // Check if this is the overlay window
  const hash = window.location.hash
  if (hash === '#overlay') {
    return <Overlay />
  }

  // Show loading state while checking setup
  if (isSetupComplete === null) {
    return (
      <>
        <TitleBar />
        <Center style={{ minHeight: '100vh', paddingTop: '32px' }}>
          <Loader size="lg" />
        </Center>
      </>
    )
  }

  // Show welcome page if setup is not complete
  if (!isSetupComplete) {
    return (
      <>
        <TitleBar />
        <Welcome setIsSetupComplete={setIsSetupComplete}/>
      </>
    )
  } else {
    return (
      <>
        <TitleBar />
        <DefaultView userInfo={user} />
      </>
    )
  }
}

export default App