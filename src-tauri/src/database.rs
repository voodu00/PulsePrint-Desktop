use serde::{Deserialize, Serialize};
use tauri_plugin_sql::{Migration, MigrationKind};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrinterConfig {
	pub id: String,
	pub name: String,
	pub model: String,
	pub ip: String,
	pub access_code: String,
	pub serial: String,
	pub created_at: String,
	pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PrinterState {
	pub printer_id: String,
	pub status: String,
	pub nozzle_temp: f64,
	pub bed_temp: f64,
	pub chamber_temp: f64,
	pub print_progress: Option<f64>,
	pub print_filename: Option<String>,
	pub layer_current: Option<i32>,
	pub layer_total: Option<i32>,
	pub time_remaining: Option<i32>,
	pub filament_type: Option<String>,
	pub filament_color: Option<String>,
	pub error_message: Option<String>,
	pub error_code: Option<i32>,
	pub last_seen: String,
	pub updated_at: String,
}

pub fn get_migrations() -> Vec<Migration> {
	vec![
		Migration {
			version: 1,
			description: "create_printers_table",
			sql: "CREATE TABLE printers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                model TEXT NOT NULL,
                ip TEXT NOT NULL,
                access_code TEXT NOT NULL,
                serial TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );",
			kind: MigrationKind::Up,
		},
		Migration {
			version: 2,
			description: "create_printer_states_table",
			sql: "CREATE TABLE printer_states (
                printer_id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'offline',
                nozzle_temp REAL NOT NULL DEFAULT 0.0,
                bed_temp REAL NOT NULL DEFAULT 0.0,
                chamber_temp REAL NOT NULL DEFAULT 0.0,
                print_progress REAL,
                print_filename TEXT,
                layer_current INTEGER,
                layer_total INTEGER,
                time_remaining INTEGER,
                filament_type TEXT,
                filament_color TEXT,
                error_message TEXT,
                error_code INTEGER,
                last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE
            );",
			kind: MigrationKind::Up,
		},
		Migration {
			version: 3,
			description: "create_indexes",
			sql: "CREATE INDEX idx_printer_states_printer_id ON printer_states(printer_id);
                  CREATE INDEX idx_printer_states_status ON printer_states(status);
                  CREATE INDEX idx_printer_states_last_seen ON printer_states(last_seen);
                  CREATE INDEX idx_printers_serial ON printers(serial);",
			kind: MigrationKind::Up,
		},
	]
}

// Database operations will be handled directly from the frontend using the SQL plugin
// The Rust side will focus on printer communication and state management
