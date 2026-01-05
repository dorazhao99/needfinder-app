import { Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'node:path'
import { startRecording } from '../services/recording'
import { stopRecording } from '../services/recording'
import { app } from 'electron'
import { inferActions } from '../services/inferActions'


export function createTray(win: BrowserWindow) {
    // use a template icon for macOS so it adapts to dark/light mode
    const iconPath = path.join(process.env.VITE_PUBLIC, "recordTemplate.png");
    console.log(iconPath);
    const icon = nativeImage.createFromPath(iconPath);
  
    let tray = new Tray(icon);
    tray.setToolTip(app.getName());
  
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `Open ${app.getName()}`,
        click: () => {
          if (win) {
            win.show();
            win.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: "Start Recording",
        click: () => {
          startRecording();
        },
      },
      {
        label: "Pause Recording",
        click: () => {
          stopRecording();
        },
      },
      { type: 'separator' },
      {
        label: "Infer Actions",
        click: () => {
          inferActions();
        },
      },
      { type: 'separator' },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      }
    ]);
  
    tray.setContextMenu(contextMenu);
    return tray
  }
  