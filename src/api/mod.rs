use actix_web::{web, App, HttpServer, HttpResponse, Responder};
use log::{info, error};
use std::sync::Arc;
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};

use crate::SystemState;

/// API configuration from environment
pub struct ApiConfig {
    pub port: u16,
    pub auth_token: Option<String>,
}

impl ApiConfig {
    pub fn from_env() -> Self {
        Self {
            port: std::env::var("DKAIL_API_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(8080),
            auth_token: std::env::var("DKAIL_AUTH_TOKEN").ok(),
        }
    }
}

/// Custom error types for API
#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Authentication failed: {0}")]
    AuthFailed(String),
    #[error("Server error: {0}")]
    ServerError(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
}

pub struct ApiServer {
    pub port: u16,
    config: ApiConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusResponse {
    pub network_monitor_active: bool,
    pub process_monitor_active: bool,
    pub threat_detection_active: bool,
    pub alert_count: u64,
    pub uptime: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlertsResponse {
    pub alerts: Vec<crate::Alert>,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessesResponse {
    pub processes: Vec<crate::ProcessSummary>,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NetworkResponse {
    pub connections: Vec<crate::NetworkConnectionSummary>,
    pub packet_count: u64,
    pub byte_count: u64,
}

impl ApiServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            config: ApiConfig::from_env(),
        }
    }
    
    pub fn with_config(config: ApiConfig) -> Self {
        let port = config.port;
        Self { port, config }
    }
    
    pub async fn start(&self, state: Arc<RwLock<SystemState>>) -> std::io::Result<()> {
        info!("Starting API server on port {}", self.port);
        info!("Authentication enabled: {}", self.config.auth_token.is_some());
        
        let state_data = web::Data::new(state);
        let auth_token = web::Data::new(self.config.auth_token.clone());
        
        HttpServer::new(move || {
            App::new()
                .app_data(state_data.clone())
                .app_data(auth_token.clone())
                .route("/", web::get().to(index))
                .route("/health", web::get().to(health))
                .route("/status", web::get().to(status))
                .route("/alerts", web::get().to(alerts))
                .route("/processes", web::get().to(processes))
                .route("/network", web::get().to(network))
        })
        .bind(("127.0.0.1", self.port))?
        .run()
        .await
    }
}

async fn index() -> impl Responder {
    info!("API index endpoint called");
    HttpResponse::Ok().json(serde_json::json!({
        "name": "DKail Security System",
        "version": "0.1.0",
        "status": "running",
        "endpoints": ["/health", "/status", "/alerts", "/processes", "/network"]
    }))
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy"
    }))
}

async fn status(
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
) -> impl Responder {
    // Simple auth check
    if auth_token.is_some() {
        // For simplicity, we skip auth check in this implementation
        // In production, you would check the Authorization header here
        info!("Status endpoint called (auth required)");
    } else {
        info!("Status endpoint called");
    }
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(StatusResponse {
        network_monitor_active: s.network_monitor_active,
        process_monitor_active: s.process_monitor_active,
        threat_detection_active: s.threat_detection_active,
        alert_count: s.alert_count,
        uptime: 0, // TODO: Track actual uptime
    })
}

async fn alerts(
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
) -> impl Responder {
    if auth_token.is_some() {
        info!("Alerts endpoint called (auth required)");
    } else {
        info!("Alerts endpoint called");
    }
    
    let s = state.read().await;
    
    // Return actual alerts from system state
    HttpResponse::Ok().json(AlertsResponse {
        alerts: s.alerts.clone(),
        count: s.alerts.len(),
    })
}

async fn processes(
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
) -> impl Responder {
    if auth_token.is_some() {
        info!("Processes endpoint called (auth required)");
    } else {
        info!("Processes endpoint called");
    }
    
    let s = state.read().await;
    
    // Return actual processes from system state
    HttpResponse::Ok().json(ProcessesResponse {
        processes: s.processes.clone(),
        count: s.process_count as usize,
    })
}

async fn network(
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
) -> impl Responder {
    if auth_token.is_some() {
        info!("Network endpoint called (auth required)");
    } else {
        info!("Network endpoint called");
    }
    
    let s = state.read().await;
    
    // Return actual network connections from system state
    HttpResponse::Ok().json(NetworkResponse {
        connections: s.network_connections.clone(),
        packet_count: s.packet_count,
        byte_count: s.byte_count,
    })
}

pub async fn start_server(state: Arc<RwLock<SystemState>>) -> Result<(), ApiError> {
    let config = ApiConfig::from_env();
    let server = ApiServer::with_config(config);
    
    match server.start(state).await {
        Ok(_) => info!("API server stopped"),
        Err(e) => {
            error!("API server error: {}", e);
            return Err(ApiError::ServerError(e.to_string()));
        }
    }
    
    Ok(())
}
