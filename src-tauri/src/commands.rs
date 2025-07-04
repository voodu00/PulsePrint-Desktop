use crate::mqtt::{MqttService, PrintCommand, PrinterConfig, Printer};
use tauri::State;

#[tauri::command]
pub async fn add_printer(
    mqtt_service: State<'_, MqttService>,
    config: PrinterConfig,
) -> Result<(), String> {
    mqtt_service.add_printer(config).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_printer(
    mqtt_service: State<'_, MqttService>,
    printer_id: String,
) -> Result<(), String> {
    mqtt_service.remove_printer(&printer_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_all_printers(
    mqtt_service: State<'_, MqttService>,
) -> Result<Vec<Printer>, String> {
    Ok(mqtt_service.get_all_printers().await)
}

#[tauri::command]
pub async fn send_printer_command(
    mqtt_service: State<'_, MqttService>,
    printer_id: String,
    command: PrintCommand,
) -> Result<(), String> {
    mqtt_service.send_command(&printer_id, command).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pause_printer(
    mqtt_service: State<'_, MqttService>,
    printer_id: String,
) -> Result<(), String> {
    let command = PrintCommand {
        action: "pause".to_string(),
    };
    send_printer_command(mqtt_service, printer_id, command).await
}

#[tauri::command]
pub async fn resume_printer(
    mqtt_service: State<'_, MqttService>,
    printer_id: String,
) -> Result<(), String> {
    let command = PrintCommand {
        action: "resume".to_string(),
    };
    send_printer_command(mqtt_service, printer_id, command).await
}

#[tauri::command]
pub async fn stop_printer(
    mqtt_service: State<'_, MqttService>,
    printer_id: String,
) -> Result<(), String> {
    let command = PrintCommand {
        action: "stop".to_string(),
    };
    send_printer_command(mqtt_service, printer_id, command).await
}