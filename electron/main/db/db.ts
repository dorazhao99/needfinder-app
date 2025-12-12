import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'


let db;

export function initDatabase() {
    const dbPath = path.join(app.getPath('userData'), 'app.db');
    db = new Database(dbPath);
    console.log('Database path:', dbPath);
  
    db.exec(`
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            file_dir TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS annotations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS interview (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transcript TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            tagline TEXT NOT NULL, 
            description TEXT NOT NULL,
            context TEXT NOT NULL,
            supporting_evidence TEXT NOT NULL,
            metainsight BOOLEAN NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS reframes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            request_id INTEGER NOT NULL,
            selected BOOLEAN NOT NULL DEFAULT FALSE,
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
        );  
        
        CREATE TABLE IF NOT EXISTS solutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            user_inputs TEXT NOT NULL,
            execution_prompt TEXT NOT NULL,
            model TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            request_id INTEGER NOT NULL,
            selected BOOLEAN NOT NULL DEFAULT FALSE,
            use_insights BOOLEAN NOT NULL DEFAULT TRUE,
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS agent_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            solution_id INTEGER NOT NULL,
            agent_response TEXT NOT NULL,
            artifact_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (solution_id) REFERENCES solutions(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS request_insights (
            request_id INTEGER NOT NULL,
            insight_id INTEGER NOT NULL,
            PRIMARY KEY (request_id, insight_id),
            FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
            FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE
        );

    `)
  }

  export { db }