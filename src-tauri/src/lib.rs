mod commands;
mod database;
mod mqtt;

use mqtt::MqttService;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	// Define migrations for user preferences
	let migrations = vec![Migration {
		version: 1,
		description: "create_user_preferences_table",
		sql: "CREATE TABLE IF NOT EXISTS user_preferences (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
		kind: MigrationKind::Up,
	}];

	tauri::Builder::default()
		.plugin(
			tauri_plugin_sql::Builder::new()
				.add_migrations("sqlite:pulseprint.db", migrations)
				.build(),
		)
		.setup(|app| {
			app.manage(MqttService::new(app.handle().clone()));
			Ok(())
		})
		.invoke_handler(tauri::generate_handler![
			commands::add_printer,
			commands::remove_printer,
			commands::get_all_printers,
			commands::send_printer_command,
			commands::pause_printer,
			commands::resume_printer,
			commands::stop_printer,
		])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
