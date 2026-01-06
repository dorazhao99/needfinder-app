import { ipcMain } from 'electron';
import { getDb } from '../db/db';

interface User {
  id: number;
  name: string;
  file_dir: string;
  created_at: string;
  updated_at: string;
}

// Helper: get user row (id = 1)
function getUser(): User | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM user WHERE id = 1');
  return (stmt.get() as User) || null;
}

// Helper: upsert user row (id = 1)
function saveUser({ name, file_dir}: { name: string; file_dir: string}) {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM user WHERE id = 1')
    .get();

 
  console.log(name, file_dir)
  try {
  if (existing) {
    const stmt = db.prepare(`
      UPDATE user
      SET name = ?, file_dir = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);
    stmt.run(name, file_dir);
    console.log(stmt)
    return {success: true, user: {id: 1, name, file_dir}};
  } else {
    const stmt = db.prepare(`
      INSERT INTO user (id, name, file_dir)
      VALUES (1, ?, ?)
    `);
    stmt.run(name, file_dir);
    console.log(stmt)
    return {success: true, user: {id: 1, name, file_dir}};
  }
  } catch (error) {
    console.error("Error saving user: ", error);
    return {success: false, error: "Error saving user"};
  }
}

function saveSolutions({ request, model, use_insights, insight_ids, solutions }: { request: string; model: string; insight_ids: number[]; use_insights: boolean; solutions: { solution: { name: string; description: string;}, user_inputs: string; agent_prompt: string }[] }) {
  const db = getDb();
  const request_stmt = db.prepare(`
      INSERT into requests (description, created_at)
      VALUES (?, CURRENT_TIMESTAMP)
  `);
  const request_result = request_stmt.run(request);
  const request_id = request_result.lastInsertRowid;
  
  if (use_insights) {
    console.log("Saving insights: ", insight_ids);
    const insight_stmt = db.prepare(`
      INSERT into request_insights (request_id, insight_id)
      VALUES (?, ?)
    `);
    for (const iid of insight_ids) {
      insight_stmt.run(request_id, iid);
    }
  }
  // const reframe_id = 0 // TODO: get reframe id from db
  console.log("Request ID: ", request_id);
  const solution_stmt = db.prepare(`
    INSERT into solutions (name, description, user_inputs, execution_prompt, model, use_insights, created_at, request_id)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);
  const solution_ids: number[] = [];
  solutions.forEach(solution => {
    const user_inputs = JSON.stringify(solution.user_inputs);
    // Convert boolean to number (0 or 1) for SQLite
    const use_insights_num = use_insights ? 1 : 0;
    // Ensure all values are valid types (use empty strings for required text fields, not null)
    const solution_result = solution_stmt.run(
      solution.solution.name ?? '',
      solution.solution.description ?? '',
      user_inputs,
      solution.agent_prompt ?? '',
      model ?? '',
      use_insights_num,
      request_id,
    );
    solution_ids.push(Number(solution_result.lastInsertRowid));
  });
  return solution_ids;
}

function selectSolution({ solution_id }: { solution_id: number }) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM solutions WHERE id = ?
  `);
  const solution = stmt.get(solution_id);
  if (solution) {
    const updateStmt = db.prepare(`
      UPDATE solutions
      SET selected = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    updateStmt.run(solution_id);
  }
  return null;
}

function saveAgentResponse({ solution_id, agent_response, artifact_path }: { solution_id: number; agent_response: string; artifact_path: string }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT into agent_responses (solution_id, agent_response, artifact_path, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run(solution_id, agent_response, artifact_path);
  return result.lastInsertRowid;
}

function getSolutions({ request_id }: { request_id: number }) {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM solutions WHERE request_id = ?
  `);
  return stmt.all(request_id);
}

function getAllSolutions() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM solutions
  `);
  return stmt.all();
}

function getMergedInsights() {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM insights
    WHERE metainsight = TRUE
  `);
  return stmt.all();

}

// IPC: check if user exists
ipcMain.handle('user:exists', () => {
  const db = getDb();
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

  return saveUser({ name, file_dir });
});

ipcMain.handle('solutions:save', (event, { request, model, use_insights, insight_ids, solutions }) => {
  return saveSolutions({ request, model, use_insights, insight_ids, solutions });
});

ipcMain.handle('solutions:get', (event, { request_id }) => {
  return getSolutions({ request_id });
});

ipcMain.handle('solutions:getAll', () => {
  return getAllSolutions();
});

ipcMain.handle('solutions:select', (event, { solution_id }) => {
  return selectSolution({ solution_id });
});

ipcMain.handle('agent:response:save', (event, { solution_id, agent_response, artifact_path }) => {
  return saveAgentResponse({ solution_id, agent_response, artifact_path });
});

ipcMain.handle('insights:getMerged', () => {
  return getMergedInsights();
});

export { getUser, saveUser, getMergedInsights };