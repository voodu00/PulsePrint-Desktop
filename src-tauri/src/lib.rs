mod mqtt;
mod commands;

use commands::*;
use mqtt::MqttService;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Initialize MQTT service
      let mqtt_service = MqttService::new(app.handle().clone());

      // Store service in app state
      app.manage(mqtt_service);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      add_printer,
      remove_printer,
      get_all_printers,
      send_printer_command,
      pause_printer,
      resume_printer,
      stop_printer
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
