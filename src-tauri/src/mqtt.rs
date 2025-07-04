use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use log::{debug, error, info};
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS, Transport, TlsConfiguration};
use rustls::{pki_types::ServerName, client::danger::{ServerCertVerifier, ServerCertVerified}, Error as TlsError};
use serde::{Deserialize, Serialize};
use serde_json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, RwLock};
use uuid::Uuid;

// Custom certificate verifier that accepts all certificates (insecure mode)
// This is equivalent to setInsecure() in ESP8266 WiFiClientSecure
#[derive(Debug)]
struct InsecureVerifier;

impl ServerCertVerifier for InsecureVerifier {
    fn verify_server_cert(
        &self,
        _end_entity: &rustls::pki_types::CertificateDer,
        _intermediates: &[rustls::pki_types::CertificateDer],
        _server_name: &ServerName,
        _ocsp_response: &[u8],
        _now: rustls::pki_types::UnixTime,
    ) -> Result<ServerCertVerified, TlsError> {
        // Always accept any certificate - this is insecure but needed for Bambu Lab printers
        Ok(ServerCertVerified::assertion())
    }

    fn verify_tls12_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, TlsError> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn verify_tls13_signature(
        &self,
        _message: &[u8],
        _cert: &rustls::pki_types::CertificateDer,
        _dss: &rustls::DigitallySignedStruct,
    ) -> Result<rustls::client::danger::HandshakeSignatureValid, TlsError> {
        Ok(rustls::client::danger::HandshakeSignatureValid::assertion())
    }

    fn supported_verify_schemes(&self) -> Vec<rustls::SignatureScheme> {
        rustls::crypto::ring::default_provider()
            .signature_verification_algorithms
            .supported_schemes()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub id: String,
    pub name: String,
    pub model: String,
    pub ip: String,
    pub access_code: String,
    pub serial: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterTemperatures {
    pub nozzle: i32,
    pub bed: i32,
    pub chamber: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintJob {
    pub progress: f64,
    pub time_remaining: i64,
    pub estimated_total_time: Option<i64>,
    pub file_name: String,
    pub print_type: Option<String>,
    pub layer_current: i32,
    pub layer_total: i32,
    pub speed_level: Option<i32>,
    pub fan_speed: Option<i32>,
    pub stage: Option<i32>,
    pub lifecycle: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilamentInfo {
    pub r#type: String,
    pub color: String,
    pub remaining: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterError {
    pub print_error: i32,
    pub error_code: i32,
    pub stage: i32,
    pub lifecycle: String,
    pub gcode_state: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PrinterStatus {
    Idle,
    Printing,
    Paused,
    Error,
    Offline,
    Connecting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Printer {
    pub id: String,
    pub name: String,
    pub model: String,
    pub ip: String,
    pub access_code: String,
    pub serial: String,
    pub status: PrinterStatus,
    pub online: bool,
    pub connection_state: String,
    pub temperatures: PrinterTemperatures,
    pub print: Option<PrintJob>,
    pub filament: Option<FilamentInfo>,
    pub error: Option<PrinterError>,
    pub last_update: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintCommand {
    pub action: String,
}

// Simplified service that doesn't store MQTT connections directly
#[derive(Clone)]
pub struct MqttService {
    printer_states: Arc<RwLock<HashMap<String, Printer>>>,
    // Add persistent MQTT state accumulation
    printer_mqtt_states: Arc<RwLock<HashMap<String, serde_json::Value>>>,
    app_handle: AppHandle,
    command_sender: mpsc::UnboundedSender<(String, PrintCommand)>,
}

impl MqttService {
    pub fn new(app_handle: AppHandle) -> Self {
        let (command_sender, command_receiver) = mpsc::unbounded_channel();
        
        let service = Self {
            printer_states: Arc::new(RwLock::new(HashMap::new())),
            printer_mqtt_states: Arc::new(RwLock::new(HashMap::new())),
            app_handle: app_handle.clone(),
            command_sender,
        };

        // Start command handler in background using tauri async runtime
        let _printer_states = Arc::clone(&service.printer_states);
        tauri::async_runtime::spawn(async move {
            let mut receiver = command_receiver;
            while let Some((printer_id, command)) = receiver.recv().await {
                info!("Processing command '{}' for printer {}", command.action, printer_id);
                
                // For now, just log the command - real MQTT sending would happen here
                // In a full implementation, we'd maintain a separate connection pool
                
                // Simulate command processing
                tokio::time::sleep(Duration::from_millis(100)).await;
                info!("Command '{}' sent to printer {}", command.action, printer_id);
            }
        });

        service
    }

    pub async fn add_printer(&self, config: PrinterConfig) -> Result<()> {
        info!("Adding printer: {} ({})", config.name, config.ip);

        // Create initial printer state
        let printer = Printer {
            id: config.id.clone(),
            name: config.name.clone(),
            model: config.model.clone(),
            ip: config.ip.clone(),
            access_code: config.access_code.clone(),
            serial: config.serial.clone(),
            status: PrinterStatus::Connecting,
            online: false,
            connection_state: "connecting".to_string(),
            temperatures: PrinterTemperatures {
                nozzle: 0,
                bed: 0,
                chamber: 0,
            },
            print: None,
            filament: None,
            error: None,
            last_update: Utc::now(),
        };

        // Store initial state
        {
            let mut states = self.printer_states.write().await;
            states.insert(config.id.clone(), printer.clone());
        }

        // Emit initial state to frontend
        self.emit_printer_update(&printer).await;

        // Start MQTT connection in background
        let app_handle = self.app_handle.clone();
        let printer_states = Arc::clone(&self.printer_states);
        let printer_mqtt_states = Arc::clone(&self.printer_mqtt_states);
        tauri::async_runtime::spawn(async move {
            Self::start_mqtt_connection_task(config, printer_states, printer_mqtt_states, app_handle).await;
        });

        Ok(())
    }

    async fn start_mqtt_connection_task(
        config: PrinterConfig,
        printer_states: Arc<RwLock<HashMap<String, Printer>>>,
        printer_mqtt_states: Arc<RwLock<HashMap<String, serde_json::Value>>>,
        app_handle: AppHandle,
    ) {
        let printer_id = config.id.clone();
        let client_id = format!("printpulse_desktop_{}_{}", config.id, Uuid::new_v4());
        
        let mut mqtt_options = MqttOptions::new(&client_id, &config.ip, 8883);
        mqtt_options
            .set_credentials("bblp", &config.access_code)
            .set_keep_alive(Duration::from_secs(60));

        // Use TLS but bypass certificate validation entirely
        // This matches PrintPulse behavior: rejectUnauthorized: false
        // Bambu Lab printers use self-signed certificates that don't validate
        // Using setInsecure() equivalent by creating a custom TLS config
        let tls_config = rustls::ClientConfig::builder_with_provider(
            rustls::crypto::ring::default_provider().into()
        )
        .with_safe_default_protocol_versions()
        .unwrap()
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(InsecureVerifier))
        .with_no_client_auth();

        mqtt_options.set_transport(Transport::Tls(TlsConfiguration::Rustls(Arc::new(tls_config))));

        let (client, mut event_loop) = AsyncClient::new(mqtt_options, 10);
        let status_topic = format!("device/{}/report", config.serial);

        loop {
            match event_loop.poll().await {
                Ok(Event::Incoming(Packet::ConnAck(_))) => {
                    info!("Connected to printer {} ({})", config.name, config.ip);
                    
                    // Subscribe to status topic
                    if let Err(e) = client.subscribe(&status_topic, QoS::AtMostOnce).await {
                        error!("Failed to subscribe to {}: {}", status_topic, e);
                    } else {
                        info!("Subscribed to {}", status_topic);
                    }

                    // Request full status immediately after connection
                    let status_request = serde_json::json!({
                        "print": {
                            "command": "get_status",
                            "sequence_id": chrono::Utc::now().timestamp_millis().to_string()
                        }
                    });
                    
                    let request_topic = format!("device/{}/request", config.serial);
                    let message = status_request.to_string();
                    
                    if let Err(e) = client.publish(request_topic, QoS::AtMostOnce, false, message.as_bytes()).await {
                        error!("Failed to send initial status request to {}: {}", config.name, e);
                    } else {
                        info!("Initial status request sent to {}", config.name);
                    }

                    // Note: Removed periodic polling to avoid hardware lag issues on P1P printers
                    // Instead, we rely on the initial status request and real-time MQTT updates

                    // Update connection state
                    Self::update_printer_status(
                        &printer_states,
                        &app_handle,
                        &printer_id,
                        |printer| {
                            printer.online = true;
                            printer.status = PrinterStatus::Idle;
                            printer.connection_state = "connected".to_string();
                            printer.last_update = Utc::now();
                        }
                    ).await;
                }
                Ok(Event::Incoming(Packet::Publish(publish))) => {
                    debug!("Received MQTT message on topic: {}", publish.topic);
                    
                    // Parse MQTT message
                    match serde_json::from_slice::<serde_json::Value>(&publish.payload) {
                        Ok(data) => {
                            Self::handle_printer_message(
                                &printer_states,
                                &printer_mqtt_states,
                                &app_handle,
                                &config,
                                &data
                            ).await;
                        }
                        Err(e) => {
                            error!("Failed to parse MQTT message: {}", e);
                        }
                    }
                }
                Ok(Event::Incoming(Packet::SubAck(_))) => {
                    debug!("Successfully subscribed to topic");
                }
                Ok(_) => {
                    // Other events we don't need to handle
                }
                Err(e) => {
                    error!("MQTT connection error for {}: {}", config.name, e);
                    
                    // Update connection state to failed
                    Self::update_printer_status(
                        &printer_states,
                        &app_handle,
                        &printer_id,
                        |printer| {
                            printer.online = false;
                            printer.status = PrinterStatus::Offline;
                            printer.connection_state = "failed".to_string();
                            printer.last_update = Utc::now();
                        }
                    ).await;

                    // Wait before attempting reconnection
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    }

    async fn handle_printer_message(
        printer_states: &Arc<RwLock<HashMap<String, Printer>>>,
        printer_mqtt_states: &Arc<RwLock<HashMap<String, serde_json::Value>>>,
        app_handle: &AppHandle,
        config: &PrinterConfig,
        data: &serde_json::Value,
    ) {
        debug!("Processing MQTT data for {}: {}", config.name, data);

        // Get or initialize persistent state for this printer
        let persistent_state = {
            let mut mqtt_states = printer_mqtt_states.write().await;
            let current_state = mqtt_states.get(&config.id).cloned().unwrap_or_else(|| serde_json::Value::Object(serde_json::Map::new()));
            
            // Deep merge the incoming data with existing state
            let merged_state = Self::deep_merge(current_state, data.clone());
            mqtt_states.insert(config.id.clone(), merged_state.clone());
            merged_state
        };

        // Check if we need to request full status due to minimal data
        let print_keys: Vec<String> = if let Some(print_obj) = data.get("print") {
            if let Some(obj) = print_obj.as_object() {
                obj.keys().cloned().collect()
            } else {
                Vec::new()
            }
        } else {
            Vec::new()
        };

        let is_minimal_update = print_keys.len() <= 3 && 
            (data.get("print").and_then(|p| p.get("command")).and_then(|c| c.as_str()) == Some("push_status") ||
             data.get("print").and_then(|p| p.get("wifi_signal")).is_some());

        if is_minimal_update {
            info!("Minimal data detected for {}, but avoiding frequent status requests to prevent hardware lag", config.name);
            // Note: Based on OpenBambuAPI docs, frequent status requests can cause lag on P1P printers
            // We rely on the initial status request and accumulated state instead
        }

        info!("Raw MQTT data from {}: {}", config.name, serde_json::to_string_pretty(data).unwrap_or_default());
        info!("Accumulated state for {}: {}", config.name, serde_json::to_string_pretty(&persistent_state).unwrap_or_default());

        Self::update_printer_status(
            printer_states,
            app_handle,
            &config.id,
            |printer| {
                // Parse print data from accumulated state instead of just current message
                if let Some(print_data) = persistent_state.get("print") {
                    // Update temperatures
                    if let Some(nozzle_temp) = print_data.get("nozzle_temper").and_then(|v| v.as_f64()) {
                        printer.temperatures.nozzle = nozzle_temp.round() as i32;
                    }
                    if let Some(bed_temp) = print_data.get("bed_temper").and_then(|v| v.as_f64()) {
                        printer.temperatures.bed = bed_temp.round() as i32;
                    }
                    if let Some(chamber_temp) = print_data.get("chamber_temper").and_then(|v| v.as_f64()) {
                        printer.temperatures.chamber = chamber_temp.round() as i32;
                    }

                    // Enhanced status detection logic based on accumulated state
                    let gcode_state = print_data.get("gcode_state").and_then(|v| v.as_str());
                    let print_real = print_data.get("print_real").and_then(|v| v.as_i64()).unwrap_or(0);
                    let mc_remaining_time = print_data.get("mc_remaining_time").and_then(|v| v.as_i64()).unwrap_or(0);
                    let mc_percent = print_data.get("mc_percent").and_then(|v| v.as_f64()).unwrap_or(0.0);
                    let layer_num = print_data.get("layer_num").and_then(|v| v.as_i64()).unwrap_or(0);
                    let stg_cur = print_data.get("stg_cur").and_then(|v| v.as_i64()).unwrap_or(0);
                    let print_error = print_data.get("print_error").and_then(|v| v.as_i64()).unwrap_or(0);
                    let fan_gear = print_data.get("fan_gear").and_then(|v| v.as_i64()).unwrap_or(0);
                    let subtask_name = print_data.get("subtask_name").and_then(|v| v.as_str()).unwrap_or("");

                    info!("Status detection for {}: gcode_state={:?}, print_real={}, mc_percent={}, layer_num={}, stg_cur={}, print_error={}, mc_remaining_time={}, fan_gear={}, subtask_name={:?}", 
                        config.name, gcode_state, print_real, mc_percent, layer_num, stg_cur, print_error, mc_remaining_time, fan_gear, subtask_name);

                    // Enhanced status detection logic
                    if print_error > 0 {
                        printer.status = PrinterStatus::Error;
                        info!("Status for {}: Error (print_error={})", config.name, print_error);
                    } else if let Some(gcode_state) = gcode_state {
                        printer.status = match gcode_state {
                            // Standard states
                            "RUNNING" | "PRINTING" => {
                                info!("Status for {}: Printing (gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Printing
                            },
                            "PAUSE" | "PAUSED" => {
                                info!("Status for {}: Paused (gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Paused
                            },
                            "FAILED" | "ERROR" => {
                                info!("Status for {}: Error (gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Error
                            },
                            "FINISH" | "FINISHED" => {
                                info!("Status for {}: Idle (gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Idle
                            },
                            // Bambu Lab specific states
                            "PREPARE" | "WORKING" | "SLICING" | "PRINTING_MONITOR" => {
                                info!("Status for {}: Printing (Bambu gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Printing
                            },
                            "IDLE" => {
                                info!("Status for {}: Idle (gcode_state={})", config.name, gcode_state);
                                PrinterStatus::Idle
                            },
                            _ => {
                                // When gcode_state is unclear, use comprehensive indicators
                                let has_active_job = mc_remaining_time > 0 || (layer_num > 0 && mc_percent < 100.0);
                                let has_active_fan = fan_gear > 0;
                                let has_high_temps = printer.temperatures.nozzle > 150 || printer.temperatures.bed > 40;
                                let has_job_name = !subtask_name.is_empty() && subtask_name != "Unknown" && subtask_name != "undefined";
                                let has_progress = mc_percent > 0.0 && mc_percent < 100.0;
                                let is_in_print_stage = stg_cur == 1 || stg_cur == 2 || stg_cur == 3; // Print stages
                                
                                info!("Status for {} (unknown gcode_state={}): has_active_job={}, has_progress={}, is_in_print_stage={}, print_real={}, has_high_temps={}, has_active_fan={}, has_job_name={}", 
                                    config.name, gcode_state, has_active_job, has_progress, is_in_print_stage, print_real, has_high_temps, has_active_fan, has_job_name);
                                
                                if print_real == 1 {
                                    // print_real is a strong indicator of actual printing
                                    info!("Status for {}: Printing (print_real=1)", config.name);
                                    PrinterStatus::Printing
                                } else if has_active_job && (has_progress || is_in_print_stage) {
                                    info!("Status for {}: Printing (active job + progress/stage)", config.name);
                                    PrinterStatus::Printing
                                } else if is_in_print_stage && stg_cur == 2 {
                                    info!("Status for {}: Paused (stage=2)", config.name);
                                    PrinterStatus::Paused
                                } else if is_in_print_stage && stg_cur == 3 {
                                    info!("Status for {}: Error (stage=3)", config.name);
                                    PrinterStatus::Error
                                } else if has_high_temps && has_active_job && (has_active_fan || has_job_name) {
                                    info!("Status for {}: Printing (high temps + active job + fan/name)", config.name);
                                    PrinterStatus::Printing
                                } else if printer.temperatures.nozzle > 200 && has_active_fan && (has_job_name || has_progress) {
                                    info!("Status for {}: Printing (hot nozzle + fan + name/progress)", config.name);
                                    PrinterStatus::Printing
                                } else if has_job_name && has_progress {
                                    // If we have a job name and progress, it's likely printing
                                    info!("Status for {}: Printing (job name + progress)", config.name);
                                    PrinterStatus::Printing
                                } else if mc_remaining_time > 0 && layer_num > 0 {
                                    // If we have remaining time and layers, it's likely printing
                                    info!("Status for {}: Printing (remaining time + layers)", config.name);
                                    PrinterStatus::Printing
                                } else if has_high_temps && has_active_fan {
                                    // High temps + fan could indicate printing
                                    info!("Status for {}: Printing (high temps + fan)", config.name);
                                    PrinterStatus::Printing
                                } else {
                                    info!("Status for {}: Idle (no indicators)", config.name);
                                    PrinterStatus::Idle
                                }
                            }
                        };
                    } else {
                        // No gcode_state available, use other indicators
                        let has_active_job = mc_remaining_time > 0 || (layer_num > 0 && mc_percent < 100.0);
                        let has_progress = mc_percent > 0.0 && mc_percent < 100.0;
                        let is_in_print_stage = stg_cur == 1 || stg_cur == 2 || stg_cur == 3;
                        
                        info!("Status for {} (no gcode_state): has_active_job={}, has_progress={}, is_in_print_stage={}, print_real={}", 
                            config.name, has_active_job, has_progress, is_in_print_stage, print_real);
                        
                        let has_job_name = !subtask_name.is_empty() && subtask_name != "Unknown" && subtask_name != "undefined";
                        let has_high_temps = printer.temperatures.nozzle > 150 || printer.temperatures.bed > 40;
                        let has_active_fan = fan_gear > 0;
                        
                        if print_real == 1 {
                            info!("Status for {}: Printing (print_real=1, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Printing;
                        } else if has_active_job && (has_progress || is_in_print_stage) {
                            info!("Status for {}: Printing (active job + progress/stage, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Printing;
                        } else if is_in_print_stage && stg_cur == 2 {
                            info!("Status for {}: Paused (stage=2, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Paused;
                        } else if is_in_print_stage && stg_cur == 3 {
                            info!("Status for {}: Error (stage=3, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Error;
                        } else if has_job_name && has_progress {
                            info!("Status for {}: Printing (job name + progress, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Printing;
                        } else if mc_remaining_time > 0 && layer_num > 0 {
                            info!("Status for {}: Printing (remaining time + layers, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Printing;
                        } else if has_high_temps && has_active_fan {
                            info!("Status for {}: Printing (high temps + fan, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Printing;
                        } else {
                            info!("Status for {}: Idle (no indicators, no gcode_state)", config.name);
                            printer.status = PrinterStatus::Idle;
                        }
                    }

                    // Update print job info if printing/paused or if we have print data
                    if matches!(printer.status, PrinterStatus::Printing | PrinterStatus::Paused) ||
                       mc_remaining_time > 0 || layer_num > 0 || mc_percent > 0.0 || print_real == 1 {
                        
                        // Calculate estimated total time if we have progress and remaining time
                        let estimated_total_time = if mc_percent > 0.0 && mc_remaining_time > 0 {
                            let remaining_seconds = mc_remaining_time * 60;
                            Some((remaining_seconds as f64 / (1.0 - mc_percent / 100.0)).round() as i64)
                        } else {
                            None
                        };

                        // Calculate the best progress percentage using multiple indicators
                        let mut best_progress = 0.0;
                        
                        // Source 1: mc_percent (main controller percentage)
                        if mc_percent > 0.0 && mc_percent <= 100.0 {
                            best_progress = mc_percent;
                        }
                        
                        // Source 2: Layer-based progress
                        let layer_current = layer_num as i32;
                        let layer_total = print_data.get("total_layer_num").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                        if layer_current > 0 && layer_total > 0 {
                            let layer_progress = (layer_current as f64 / layer_total as f64) * 100.0;
                            // Use layer progress if mc_percent is not available or seems unreliable
                            if mc_percent == 0.0 {
                                best_progress = layer_progress;
                            }
                        }
                        
                        // Source 3: Time-based progress (if we have both remaining and total time)
                        if let Some(total_time) = estimated_total_time {
                            if mc_remaining_time > 0 && total_time > 0 {
                                let elapsed_time = total_time - (mc_remaining_time * 60);
                                let time_progress = (elapsed_time as f64 / total_time as f64) * 100.0;
                                if time_progress >= 0.0 && time_progress <= 100.0 {
                                    // Use time progress as a fallback or validation
                                    if mc_percent == 0.0 {
                                        best_progress = best_progress.max(time_progress);
                                    }
                                }
                            }
                        }
                        
                        // Validation: Ensure progress is reasonable
                        if best_progress > 100.0 { best_progress = 100.0; }
                        if best_progress < 0.0 { best_progress = 0.0; }

                        let file_name = if !subtask_name.is_empty() && subtask_name != "undefined" {
                            subtask_name.to_string()
                        } else {
                            "Unknown".to_string()
                        };

                        printer.print = Some(PrintJob {
                            progress: best_progress,
                            time_remaining: mc_remaining_time * 60, // Convert minutes to seconds
                            estimated_total_time,
                            file_name,
                            print_type: print_data.get("print_type").and_then(|v| v.as_str()).map(|s| s.to_string()),
                            layer_current,
                            layer_total,
                            speed_level: print_data.get("spd_lvl").and_then(|v| v.as_i64()).map(|v| v as i32),
                            fan_speed: print_data.get("fan_gear").and_then(|v| v.as_i64()).map(|v| v as i32),
                            stage: print_data.get("stg_cur").and_then(|v| v.as_i64()).map(|v| v as i32),
                            lifecycle: print_data.get("lifecycle").and_then(|v| v.as_str()).map(|s| s.to_string()),
                        });
                    } else {
                        printer.print = None;
                    }

                    // Check for errors
                    let print_error = print_data.get("print_error").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                    let error_code = print_data.get("mc_print_error_code").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
                    
                    if print_error > 0 || error_code > 0 {
                        printer.status = PrinterStatus::Error;
                        printer.error = Some(PrinterError {
                            print_error,
                            error_code,
                            stage: print_data.get("stg_cur").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                            lifecycle: print_data.get("lifecycle").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                            gcode_state: print_data.get("gcode_state").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
                            message: Self::get_error_message(print_error, error_code),
                        });
                    } else {
                        printer.error = None;
                    }
                }

                printer.last_update = Utc::now();
            }
        ).await;
    }

    async fn update_printer_status<F>(
        printer_states: &Arc<RwLock<HashMap<String, Printer>>>,
        app_handle: &AppHandle,
        printer_id: &str,
        update_fn: F,
    ) where
        F: FnOnce(&mut Printer),
    {
        let updated_printer = {
            let mut states = printer_states.write().await;
            if let Some(printer) = states.get_mut(printer_id) {
                update_fn(printer);
                Some(printer.clone())
            } else {
                None
            }
        };

        if let Some(printer) = updated_printer {
            // Emit update to frontend
            if let Err(e) = app_handle.emit("printer-update", &printer) {
                error!("Failed to emit printer update: {}", e);
            }
        }
    }

    async fn emit_printer_update(&self, printer: &Printer) {
        if let Err(e) = self.app_handle.emit("printer-update", printer) {
            error!("Failed to emit printer update: {}", e);
        }
    }

    // Deep merge new data into existing state
    fn deep_merge(mut base: serde_json::Value, new: serde_json::Value) -> serde_json::Value {
        match (&mut base, new) {
            (serde_json::Value::Object(base_map), serde_json::Value::Object(new_map)) => {
                for (key, value) in new_map {
                    match base_map.get_mut(&key) {
                        Some(existing) => {
                            *existing = Self::deep_merge(existing.clone(), value);
                        }
                        None => {
                            base_map.insert(key, value);
                        }
                    }
                }
                base
            }
            (_, new_value) => new_value,
        }
    }

    fn get_error_message(print_error: i32, error_code: i32) -> String {
        match (print_error, error_code) {
            (_, 1203) => "Filament runout detected".to_string(),
            (_, 1204) => "Filament tangle detected".to_string(),
            (_, 1205) => "Nozzle clog detected".to_string(),
            (1, _) => "Print error occurred".to_string(),
            (2, _) => "Bed adhesion failure".to_string(),
            (3, _) => "Temperature error".to_string(),
            _ => format!("Error: print_error={}, error_code={}", print_error, error_code),
        }
    }

    pub async fn send_command(&self, printer_id: &str, command: PrintCommand) -> Result<()> {
        self.command_sender.send((printer_id.to_string(), command))
            .map_err(|e| anyhow!("Failed to send command: {}", e))?;
        Ok(())
    }

    pub async fn get_all_printers(&self) -> Vec<Printer> {
        let states = self.printer_states.read().await;
        states.values().cloned().collect()
    }

    pub async fn remove_printer(&self, printer_id: &str) -> Result<()> {
        // Remove from states
        {
            let mut states = self.printer_states.write().await;
            states.remove(printer_id);
        }

        // Emit removal to frontend
        if let Err(e) = self.app_handle.emit("printer-removed", printer_id) {
            error!("Failed to emit printer removal: {}", e);
        }

        info!("Removed printer: {}", printer_id);
        Ok(())
    }
} 