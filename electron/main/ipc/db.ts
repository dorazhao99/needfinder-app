import { ipcMain } from 'electron';
import { db } from '../db/db.ts';

// Helper: get user row (id = 1)
function getUser() {
  const stmt = db.prepare('SELECT * FROM user WHERE id = 1');
  return stmt.get() || null;
}

// Helper: upsert user row (id = 1)
function saveUser({ name, file_dir}: { name: string; file_dir: string}) {
  const existing = db
    .prepare('SELECT id FROM user WHERE id = 1')
    .get();

 
    console.log(name, file_dir)
  if (existing) {
    const stmt = db.prepare(`
      UPDATE user
      SET name = ?, file_dir = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    stmt.run(name, file_dir);
    console.log(stmt)

  } else {
    const stmt = db.prepare(`
      INSERT INTO user (id, name, file_dir)
      VALUES (1, ?, ?)
    `);
    stmt.run(name, file_dir);
    console.log(stmt)

  }

  return getUser();
}

// IPC: check if user exists
ipcMain.handle('user:exists', () => {
  const row = db.prepare('SELECT 1 FROM user WHERE id = 1').get();
  return !!row;
});

// IPC: get user profile (or null)
ipcMain.handle('user:get', () => {
  return getUser();
});

// IPC: save/update user profile
ipcMain.handle('user:save', (event, { name, file_dir }) => {
  if (!name || !file_dir) {
    throw new Error('name and file_dir are required');
  }

  const user = saveUser({ name, file_dir });
  return {
    success: true,
    user,
  };
});

export { getUser, saveUser };