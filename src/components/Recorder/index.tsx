import React from 'react';
import './recorder.css';
import { Button, Card, Container } from '@mantine/core';

interface User {
    name: string
    file_dir: string
  }

export default function Recorder() {

    const handleStartRecording = () => {
        window.electronAPI.runPython()
    }

    const pauseRecording = () => {
        window.electronAPI.stopPython()
    }
  return (
    <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        <div className='App'>
          <Card shadow="sm" padding="lg" radius="md" withBorder mb="md">
            <Button
              onClick={() => handleStartRecording()}
              color={"blue"}
              size="lg"
              fullWidth
            >
              {"▶ Play"}
            </Button>
            <Button
              onClick={() => pauseRecording()}
              color={"red"}
              size="lg"
              fullWidth
            >
              {"⏸ Pause"}
            </Button>
          </Card>
        </div>
    </div> 
  );
};


