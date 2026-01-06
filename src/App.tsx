import { useState, useEffect } from 'react'
import { Button, Card, Container, Loader, Center } from '@mantine/core'

import UpdateElectron from '@/components/update'
import Welcome from '@/components/Welcome'
import Overlay from '@/components/Overlay'
import Notification from '@/components/Notification'
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
  const [notification, setNotification] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false
  })

  useEffect(() => {
    // Check if this is the overlay window
    const hash = window.location.hash
    if (hash === '#overlay') {
      return // Don't run setup check for overlay window
    }
    checkSetup()

    // Listen for notification events from main process
    const handleNotification = (_event: Electron.IpcRendererEvent, message: string) => {
      console.log('Received notification:', message);
      setNotification({ message, visible: true })
    }

    if (window.ipcRenderer) {
      window.ipcRenderer.on('show-notification', handleNotification)
      
      return () => {
        window.ipcRenderer.off('show-notification', handleNotification)
      }
    }
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
    return (
      <>
        <Overlay />
        <Notification
          message={notification.message}
          visible={notification.visible}
          onClose={() => setNotification({ message: '', visible: false })}
        />
      </>
    )
  }

  // Show loading state while checking setup
  if (isSetupComplete === null) {
    return (
      <>
        <TitleBar />
        <Center style={{ minHeight: '100vh', paddingTop: '32px' }}>
          <Loader size="lg" />
        </Center>
        <Notification
          message={notification.message}
          visible={notification.visible}
          onClose={() => setNotification({ message: '', visible: false })}
        />
      </>
    )
  }

  // Show welcome page if setup is not complete
  if (!isSetupComplete) {
    return (
      <>
        <TitleBar />
        <Welcome setIsSetupComplete={setIsSetupComplete}/>
        <Notification
          message={notification.message}
          visible={notification.visible}
          onClose={() => setNotification({ message: '', visible: false })}
        />
      </>
    )
  } else {
    return (
      <>
        <TitleBar />
        <DefaultView userInfo={user} />
        <Notification
          message={notification.message}
          visible={notification.visible}
          onClose={() => setNotification({ message: '', visible: false })}
        />
      </>
    )
  }
}

export default App