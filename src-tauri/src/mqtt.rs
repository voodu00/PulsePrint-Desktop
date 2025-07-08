use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use log::{debug, error, info};
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS, TlsConfiguration, Transport};
use rustls::{
	client::danger::{ServerCertVerified, ServerCertVerifier},
	pki_types::ServerName,
	Error as TlsError,
};
use serde::{Deserialize, Serialize};
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
	// Add connection pool for sending commands
	printer_connections: Arc<RwLock<HashMap<String, AsyncClient>>>,
	app_handle: AppHandle,
	command_sender: mpsc::UnboundedSender<(String, PrintCommand)>,
}

impl MqttService {
	pub fn new(app_handle: AppHandle) -> Self {
		let (command_sender, command_receiver) = mpsc::unbounded_channel();

		let service = Self {
			printer_states: Arc::new(RwLock::new(HashMap::new())),
			printer_mqtt_states: Arc::new(RwLock::new(HashMap::new())),
			printer_connections: Arc::new(RwLock::new(HashMap::new())),
			app_handle: app_handle.clone(),
			command_sender,
		};

		// Start command handler in background using tauri async runtime
		let printer_states = Arc::clone(&service.printer_states);
		let printer_connections = Arc::clone(&service.printer_connections);
		tauri::async_runtime::spawn(async move {
			let mut receiver = command_receiver;
			while let Some((printer_id, command)) = receiver.recv().await {
				info!(
					"Processing command '{}' for printer {}",
					command.action, printer_id
				);

				// Get printer configuration and MQTT client
				let (printer_serial, mqtt_client) = {
					let states = printer_states.read().await;
					let connections = printer_connections.read().await;

					if let Some(printer) = states.get(&printer_id) {
						if let Some(client) = connections.get(&printer_id) {
							(printer.serial.clone(), client.clone())
						} else {
							error!("No MQTT connection found for printer {printer_id}");
							continue;
						}
					} else {
						error!("Printer {printer_id} not found");
						continue;
					}
				};

				// Send actual MQTT command
				match Self::send_mqtt_command(&mqtt_client, &printer_serial, &command).await {
					Ok(_) => {
						info!(
							"Command '{}' sent successfully to printer {}",
							command.action, printer_id
						);
					}
					Err(e) => {
						error!(
							"Failed to send command '{}' to printer {}: {}",
							command.action, printer_id, e
						);
					}
				}
			}
		});

		service
	}

	async fn send_mqtt_command(
		client: &AsyncClient,
		printer_serial: &str,
		command: &PrintCommand,
	) -> Result<()> {
		let request_topic = format!("device/{printer_serial}/request");
		let sequence_id = chrono::Utc::now().timestamp_millis().to_string();

		let mqtt_command = match command.action.as_str() {
			"pause" => serde_json::json!({
				"print": {
					"command": "pause",
					"sequence_id": sequence_id
				}
			}),
			"resume" => serde_json::json!({
				"print": {
					"command": "resume",
					"sequence_id": sequence_id
				}
			}),
			"stop" => serde_json::json!({
				"print": {
					"command": "stop",
					"sequence_id": sequence_id
				}
			}),
			"get_status" => serde_json::json!({
				"print": {
					"command": "get_status",
					"sequence_id": sequence_id
				}
			}),
			_ => {
				return Err(anyhow!("Unsupported command: {}", command.action));
			}
		};

		let message = mqtt_command.to_string();
		client
			.publish(request_topic, QoS::AtMostOnce, false, message.as_bytes())
			.await
			.map_err(|e| anyhow!("MQTT publish failed: {}", e))?;

		Ok(())
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
		let printer_connections = Arc::clone(&self.printer_connections);
		tauri::async_runtime::spawn(async move {
			Self::start_mqtt_connection_task(
				config,
				printer_states,
				printer_mqtt_states,
				printer_connections,
				app_handle,
			)
			.await;
		});

		Ok(())
	}

	async fn start_mqtt_connection_task(
		config: PrinterConfig,
		printer_states: Arc<RwLock<HashMap<String, Printer>>>,
		printer_mqtt_states: Arc<RwLock<HashMap<String, serde_json::Value>>>,
		printer_connections: Arc<RwLock<HashMap<String, AsyncClient>>>,
		app_handle: AppHandle,
	) {
		let printer_id = config.id.clone();
		let client_id = format!("pulseprint_desktop_{}_{}", config.id, Uuid::new_v4());

		let mut mqtt_options = MqttOptions::new(&client_id, &config.ip, 8883);
		mqtt_options
			.set_credentials("bblp", &config.access_code)
			.set_keep_alive(Duration::from_secs(60));

		// Use TLS but bypass certificate validation entirely
		// This matches PulsePrint behavior: rejectUnauthorized: false
		// Bambu Lab printers use self-signed certificates that don't validate
		// Using setInsecure() equivalent by creating a custom TLS config
		let tls_config =
			rustls::ClientConfig::builder_with_provider(rustls::crypto::ring::default_provider().into())
				.with_safe_default_protocol_versions()
				.unwrap()
				.dangerous()
				.with_custom_certificate_verifier(Arc::new(InsecureVerifier))
				.with_no_client_auth();

		mqtt_options.set_transport(Transport::Tls(TlsConfiguration::Rustls(Arc::new(
			tls_config,
		))));

		let (client, mut event_loop) = AsyncClient::new(mqtt_options, 10);
		let status_topic = format!("device/{}/report", config.serial);

		loop {
			match event_loop.poll().await {
				Ok(Event::Incoming(Packet::ConnAck(_))) => {
					info!("Connected to printer {} ({})", config.name, config.ip);

					// Subscribe to status topic
					if let Err(e) = client.subscribe(&status_topic, QoS::AtMostOnce).await {
						error!("Failed to subscribe to {status_topic}: {e}");
					} else {
						info!("Subscribed to {status_topic}");
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

					if let Err(e) = client
						.publish(request_topic, QoS::AtMostOnce, false, message.as_bytes())
						.await
					{
						error!(
							"Failed to send initial status request to {}: {}",
							config.name, e
						);
					} else {
						info!("Initial status request sent to {}", config.name);
					}

					// Note: Removed periodic polling to avoid hardware lag issues on P1P printers
					// Instead, we rely on the initial status request and real-time MQTT updates

					// Update connection state
					Self::update_printer_status(&printer_states, &app_handle, &printer_id, |printer| {
						printer.online = true;
						printer.status = PrinterStatus::Idle;
						printer.connection_state = "connected".to_string();
						printer.last_update = Utc::now();
					})
					.await;

					// Add MQTT client to connection pool
					{
						let mut connections = printer_connections.write().await;
						connections.insert(printer_id.clone(), client.clone());
					}
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
								&data,
							)
							.await;
						}
						Err(e) => {
							error!("Failed to parse MQTT message: {e}");
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
					Self::update_printer_status(&printer_states, &app_handle, &printer_id, |printer| {
						printer.online = false;
						printer.status = PrinterStatus::Offline;
						printer.connection_state = "failed".to_string();
						printer.last_update = Utc::now();
					})
					.await;

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
			let current_state = mqtt_states
				.get(&config.id)
				.cloned()
				.unwrap_or_else(|| serde_json::Value::Object(serde_json::Map::new()));

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

		let is_minimal_update = print_keys.len() <= 3
			&& (data
				.get("print")
				.and_then(|p| p.get("command"))
				.and_then(|c| c.as_str())
				== Some("push_status")
				|| data
					.get("print")
					.and_then(|p| p.get("wifi_signal"))
					.is_some());

		if is_minimal_update {
			info!("Minimal data detected for {}, but avoiding frequent status requests to prevent hardware lag", config.name);
			// Note: Based on OpenBambuAPI docs, frequent status requests can cause lag on P1P printers
			// We rely on the initial status request and accumulated state instead
		}

		info!(
			"Raw MQTT data from {}: {}",
			config.name,
			serde_json::to_string_pretty(data).unwrap_or_default()
		);
		info!(
			"Accumulated state for {}: {}",
			config.name,
			serde_json::to_string_pretty(&persistent_state).unwrap_or_default()
		);

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

                    // Calculate key indicators for status detection
                    let has_active_job = mc_remaining_time > 0 || (layer_num > 0 && mc_percent < 100.0);
                    let has_progress = mc_percent > 0.0 && mc_percent < 100.0;
                    let has_job_name = !subtask_name.is_empty() && subtask_name != "Unknown" && subtask_name != "undefined";
                    let has_high_temps = printer.temperatures.nozzle > 150 || printer.temperatures.bed > 40;
                    let has_active_fan = fan_gear > 0;
                    let is_in_print_stage = stg_cur == 1 || stg_cur == 2 || stg_cur == 3;

                    // Primary status detection: Start with the most reliable indicators
                    let new_status = if print_error > 0 {
                        info!("Status for {}: Error (print_error={})", config.name, print_error);
                        PrinterStatus::Error
                    } else if print_real == 1 {
                        // print_real is the most reliable indicator of actual printing
                        info!("Status for {}: Printing (print_real=1)", config.name);
                        PrinterStatus::Printing
                    } else if let Some(gcode_state) = gcode_state {
                        // Use gcode_state when available
                        match gcode_state {
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
                                // Even if gcode_state is IDLE, check other indicators
                                if has_active_job || has_progress || (has_high_temps && has_active_fan) {
                                    info!("Status for {}: Printing (gcode_state=IDLE but has active indicators)", config.name);
                                    PrinterStatus::Printing
                                } else {
                                    info!("Status for {}: Idle (gcode_state=IDLE, no active indicators)", config.name);
                                    PrinterStatus::Idle
                                }
                            },
                            _ => {
                                // Unknown gcode_state, use comprehensive fallback logic
                                info!("Status for {} (unknown gcode_state={}): using fallback logic", config.name, gcode_state);
                                Self::determine_status_from_indicators(
                                    &config.name,
                                    has_active_job,
                                    has_progress,
                                    is_in_print_stage,
                                    stg_cur,
                                    has_high_temps,
                                    has_active_fan,
                                    has_job_name,
                                    mc_remaining_time,
                                    layer_num,
                                    printer.temperatures.nozzle,
                                )
                            }
                        }
                    } else {
                        // No gcode_state available, use comprehensive fallback logic
                        info!("Status for {} (no gcode_state): using comprehensive fallback logic", config.name);
                        Self::determine_status_from_indicators(
                            &config.name,
                            has_active_job,
                            has_progress,
                            is_in_print_stage,
                            stg_cur,
                            has_high_temps,
                            has_active_fan,
                            has_job_name,
                            mc_remaining_time,
                            layer_num,
                            printer.temperatures.nozzle,
                        )
                    };

                    // Apply the determined status with validation
                    let previous_status = printer.status.clone();
                    let should_update_status = match (&previous_status, &new_status) {
                        // Allow any change to/from Error or Offline
                        (PrinterStatus::Error, _) | (_, PrinterStatus::Error) => true,
                        (PrinterStatus::Offline, _) | (_, PrinterStatus::Offline) => true,
                        (PrinterStatus::Connecting, _) | (_, PrinterStatus::Connecting) => true,

                        // Allow transitions from Idle to Printing if we have strong indicators
                        (PrinterStatus::Idle, PrinterStatus::Printing) => {
                            has_active_job || has_progress || print_real == 1 || (has_high_temps && has_active_fan)
                        },

                        // Be more cautious about transitions from Printing to Idle
                        (PrinterStatus::Printing, PrinterStatus::Idle) => {
                            // Only allow if we have strong evidence that printing has stopped
                            let has_completion_indicators = mc_percent >= 100.0 ||
                                                           (mc_remaining_time == 0 && layer_num == 0) ||
                                                           (!has_high_temps && !has_active_fan && !has_active_job);

                            if has_completion_indicators {
                                info!("Status for {}: Allowing transition from Printing to Idle (completion indicators)", config.name);
                                true
                            } else {
                                info!("Status for {}: Preventing spurious transition from Printing to Idle (active indicators still present)", config.name);
                                false
                            }
                        },

                        // Allow other transitions
                        _ => true,
                    };

                    if should_update_status {
                        let status_changed = !matches!((&previous_status, &new_status),
                            (PrinterStatus::Idle, PrinterStatus::Idle) |
                            (PrinterStatus::Printing, PrinterStatus::Printing) |
                            (PrinterStatus::Paused, PrinterStatus::Paused) |
                            (PrinterStatus::Error, PrinterStatus::Error) |
                            (PrinterStatus::Offline, PrinterStatus::Offline) |
                            (PrinterStatus::Connecting, PrinterStatus::Connecting)
                        );

                        if status_changed {
                            info!("Status for {}: Changed from {:?} to {:?}", config.name, previous_status, new_status);
                        }
                        printer.status = new_status;
                    } else {
                        info!("Status for {}: Keeping previous status {:?} (transition validation failed)", config.name, previous_status);
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
                                if (0.0..=100.0).contains(&time_progress) {
                                    // Use time progress as a fallback or validation
                                    if mc_percent == 0.0 {
                                        best_progress = best_progress.max(time_progress);
                                    }
                                }
                            }
                        }

                        // Validation: Ensure progress is reasonable
                        best_progress = best_progress.clamp(0.0, 100.0);

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
				error!("Failed to emit printer update: {e}");
			}
		}
	}

	async fn emit_printer_update(&self, printer: &Printer) {
		if let Err(e) = self.app_handle.emit("printer-update", printer) {
			error!("Failed to emit printer update: {e}");
		}
	}

	// Deep merge new data into existing state
	fn deep_merge(mut base: serde_json::Value, new: serde_json::Value) -> serde_json::Value {
		match (&mut base, new) {
			(serde_json::Value::Object(base_map), serde_json::Value::Object(new_map)) => {
				for (key, value) in new_map {
					match base_map.get_mut(&key) {
						Some(existing) => {
							// For critical status fields, preserve existing values if new values are empty/null
							if key == "subtask_name" && value.as_str().unwrap_or("").is_empty() {
								if let Some(existing_str) = existing.as_str() {
									if !existing_str.is_empty()
										&& existing_str != "Unknown"
										&& existing_str != "undefined"
									{
										// Keep existing non-empty subtask_name
										continue;
									}
								}
							}

							// For progress fields, don't overwrite with zero unless it's actually finished
							if key == "mc_percent" && value.as_f64().unwrap_or(0.0) == 0.0 {
								if let Some(existing_percent) = existing.as_f64() {
									if existing_percent > 0.0 && existing_percent < 100.0 {
										// Keep existing progress unless we have evidence the print is done
										continue;
									}
								}
							}

							// For remaining time, don't overwrite with zero unless progress is 100%
							if key == "mc_remaining_time" && value.as_i64().unwrap_or(0) == 0 {
								if let Some(existing_time) = existing.as_i64() {
									if existing_time > 0 {
										// Keep existing remaining time if it's positive and new value is zero
										// This prevents losing time data from partial updates
										continue;
									}
								}
							}

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
			_ => format!("Error: print_error={print_error}, error_code={error_code}"),
		}
	}

	pub async fn send_command(&self, printer_id: &str, command: PrintCommand) -> Result<()> {
		self
			.command_sender
			.send((printer_id.to_string(), command))
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

		// Remove from MQTT states
		{
			let mut mqtt_states = self.printer_mqtt_states.write().await;
			mqtt_states.remove(printer_id);
		}

		// Remove from connection pool
		{
			let mut connections = self.printer_connections.write().await;
			connections.remove(printer_id);
		}

		// Emit removal to frontend
		if let Err(e) = self.app_handle.emit("printer-removed", printer_id) {
			error!("Failed to emit printer removal: {e}");
		}

		info!("Removed printer: {printer_id}");
		Ok(())
	}

	#[allow(clippy::too_many_arguments)]
	fn determine_status_from_indicators(
		name: &str,
		has_active_job: bool,
		has_progress: bool,
		is_in_print_stage: bool,
		stg_cur: i64,
		has_high_temps: bool,
		has_active_fan: bool,
		has_job_name: bool,
		mc_remaining_time: i64,
		layer_num: i64,
		nozzle_temp: i32,
	) -> PrinterStatus {
		if has_active_job && (has_progress || is_in_print_stage) {
			info!("Status for {name}: Printing (active job + progress/stage)");
			PrinterStatus::Printing
		} else if is_in_print_stage && stg_cur == 2 {
			info!("Status for {name}: Paused (stage=2)");
			PrinterStatus::Paused
		} else if is_in_print_stage && stg_cur == 3 {
			info!("Status for {name}: Error (stage=3)");
			PrinterStatus::Error
		} else if has_high_temps && has_active_job && (has_active_fan || has_job_name) {
			info!("Status for {name}: Printing (high temps + active job + fan/name)");
			PrinterStatus::Printing
		} else if nozzle_temp > 200 && has_active_fan && (has_job_name || has_progress) {
			info!("Status for {name}: Printing (hot nozzle + fan + name/progress)");
			PrinterStatus::Printing
		} else if has_job_name && has_progress {
			info!("Status for {name}: Printing (job name + progress)");
			PrinterStatus::Printing
		} else if mc_remaining_time > 0 && layer_num > 0 {
			info!("Status for {name}: Printing (remaining time + layers)");
			PrinterStatus::Printing
		} else if has_high_temps && has_active_fan {
			info!("Status for {name}: Printing (high temps + fan)");
			PrinterStatus::Printing
		} else {
			info!("Status for {name}: Idle (no indicators)");
			PrinterStatus::Idle
		}
	}
}
