use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
	pub id: String,
	pub key: String,
	pub value: String,
	pub created_at: String,
	pub updated_at: String,
}

// Database operations will be handled directly from the frontend using the SQL plugin
// The Rust side will focus on printer communication and state management
