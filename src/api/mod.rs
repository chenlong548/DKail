use actix_web::{web, App, HttpServer, HttpResponse, Responder, HttpRequest, http::header};
use log::{info, error, warn};
use std::sync::Arc;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use serde::{Serialize, Deserialize};

use crate::SystemState;

/// Rate limiter for API protection
#[derive(Debug)]
pub struct RateLimiter {
    requests: Arc<RwLock<HashMap<String, Vec<Instant>>>>,
    max_requests: usize,
    window_secs: u64,
}

impl RateLimiter {
    pub fn new(max_requests: usize, window_secs: u64) -> Self {
        Self {
            requests: Arc::new(RwLock::new(HashMap::new())),
            max_requests,
            window_secs,
        }
    }

    pub async fn check(&self, client_ip: &str) -> bool {
        let mut requests = self.requests.write().await;
        let now = Instant::now();
        let window = Duration::from_secs(self.window_secs);

        let entry = requests.entry(client_ip.to_string()).or_insert_with(Vec::new);
        
        entry.retain(|&t| now.duration_since(t) < window);
        
        if entry.len() >= self.max_requests {
            return false;
        }
        
        entry.push(now);
        true
    }

    pub async fn cleanup(&self) {
        let mut requests = self.requests.write().await;
        let now = Instant::now();
        let window = Duration::from_secs(self.window_secs);
        
        for (_, timestamps) in requests.iter_mut() {
            timestamps.retain(|&t| now.duration_since(t) < window);
        }
        
        requests.retain(|_, v| !v.is_empty());
    }
}

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
    #[error("Rate limit exceeded")]
    RateLimitExceeded,
    #[error("Server error: {0}")]
    ServerError(String),
    #[error("Invalid request: {0}")]
    InvalidRequest(String),
}

pub struct ApiServer {
    pub port: u16,
    config: ApiConfig,
    rate_limiter: RateLimiter,
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

#[derive(Debug, Serialize, Deserialize)]
pub struct ResourcesResponse {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub network_in: u64,
    pub network_out: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: String,
    pub code: u16,
}

impl ApiServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            config: ApiConfig::from_env(),
            rate_limiter: RateLimiter::new(100, 60),
        }
    }
    
    pub fn with_config(config: ApiConfig) -> Self {
        let port = config.port;
        Self { 
            port, 
            config,
            rate_limiter: RateLimiter::new(100, 60),
        }
    }
    
    pub async fn start(&self, state: Arc<RwLock<SystemState>>) -> std::io::Result<()> {
        info!("Starting API server on port {}", self.port);
        info!("Authentication enabled: {}", self.config.auth_token.is_some());
        
        let state_data = web::Data::new(state);
        let auth_token = web::Data::new(self.config.auth_token.clone());
        let rate_limiter = web::Data::new(self.rate_limiter.clone());
        
        HttpServer::new(move || {
            App::new()
                .app_data(state_data.clone())
                .app_data(auth_token.clone())
                .app_data(rate_limiter.clone())
                .wrap(actix_cors::Cors::permissive())
                .route("/", web::get().to(index))
                .route("/health", web::get().to(health))
                .route("/status", web::get().to(status))
                .route("/alerts", web::get().to(alerts))
                .route("/processes", web::get().to(processes))
                .route("/network", web::get().to(network))
                .route("/resources", web::get().to(resources))
        })
        .bind(("127.0.0.1", self.port))?
        .run()
        .await
    }
}

fn extract_bearer_token(req: &HttpRequest) -> Option<String> {
    let auth_header = req.headers().get(header::AUTHORIZATION)?;
    let auth_str = auth_header.to_str().ok()?;
    
    if auth_str.starts_with("Bearer ") {
        Some(auth_str[7..].to_string())
    } else {
        None
    }
}

fn get_client_ip(req: &HttpRequest) -> String {
    req.peer_addr()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn verify_auth(req: &HttpRequest, expected_token: &Option<String>) -> Result<(), ErrorResponse> {
    if let Some(token) = expected_token {
        let provided_token = extract_bearer_token(req)
            .ok_or_else(|| ErrorResponse {
                error: "Missing or invalid Authorization header".to_string(),
                code: 401,
            })?;
        
        if !constant_time_eq(&provided_token, token) {
            warn!("Authentication failed: invalid token");
            return Err(ErrorResponse {
                error: "Invalid authentication token".to_string(),
                code: 401,
            });
        }
    }
    Ok(())
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    
    let mut result = 0u8;
    for (x, y) in a.bytes().zip(b.bytes()) {
        result |= x ^ y;
    }
    result == 0
}

async fn index() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "name": "DKail Security System",
        "version": "1.0.0",
        "status": "running",
        "endpoints": ["/health", "/status", "/alerts", "/processes", "/network", "/resources"]
    }))
}

async fn health() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy"
    }))
}

async fn status(
    req: HttpRequest,
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
    rate_limiter: web::Data<RateLimiter>,
) -> impl Responder {
    let client_ip = get_client_ip(&req);
    
    if !rate_limiter.check(&client_ip).await {
        warn!("Rate limit exceeded for {}", client_ip);
        return HttpResponse::TooManyRequests().json(ErrorResponse {
            error: "Rate limit exceeded".to_string(),
            code: 429,
        });
    }
    
    if let Err(e) = verify_auth(&req, &auth_token) {
        return HttpResponse::Unauthorized().json(e);
    }
    
    info!("Status endpoint called");
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(StatusResponse {
        network_monitor_active: s.network_monitor_active,
        process_monitor_active: s.process_monitor_active,
        threat_detection_active: s.threat_detection_active,
        alert_count: s.alert_count,
        uptime: 0,
    })
}

async fn alerts(
    req: HttpRequest,
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
    rate_limiter: web::Data<RateLimiter>,
) -> impl Responder {
    let client_ip = get_client_ip(&req);
    
    if !rate_limiter.check(&client_ip).await {
        warn!("Rate limit exceeded for {}", client_ip);
        return HttpResponse::TooManyRequests().json(ErrorResponse {
            error: "Rate limit exceeded".to_string(),
            code: 429,
        });
    }
    
    if let Err(e) = verify_auth(&req, &auth_token) {
        return HttpResponse::Unauthorized().json(e);
    }
    
    info!("Alerts endpoint called");
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(AlertsResponse {
        alerts: s.alerts.clone(),
        count: s.alerts.len(),
    })
}

async fn processes(
    req: HttpRequest,
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
    rate_limiter: web::Data<RateLimiter>,
) -> impl Responder {
    let client_ip = get_client_ip(&req);
    
    if !rate_limiter.check(&client_ip).await {
        warn!("Rate limit exceeded for {}", client_ip);
        return HttpResponse::TooManyRequests().json(ErrorResponse {
            error: "Rate limit exceeded".to_string(),
            code: 429,
        });
    }
    
    if let Err(e) = verify_auth(&req, &auth_token) {
        return HttpResponse::Unauthorized().json(e);
    }
    
    info!("Processes endpoint called");
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(ProcessesResponse {
        processes: s.processes.clone(),
        count: s.process_count as usize,
    })
}

async fn network(
    req: HttpRequest,
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
    rate_limiter: web::Data<RateLimiter>,
) -> impl Responder {
    let client_ip = get_client_ip(&req);
    
    if !rate_limiter.check(&client_ip).await {
        warn!("Rate limit exceeded for {}", client_ip);
        return HttpResponse::TooManyRequests().json(ErrorResponse {
            error: "Rate limit exceeded".to_string(),
            code: 429,
        });
    }
    
    if let Err(e) = verify_auth(&req, &auth_token) {
        return HttpResponse::Unauthorized().json(e);
    }
    
    info!("Network endpoint called");
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(NetworkResponse {
        connections: s.network_connections.clone(),
        packet_count: s.packet_count,
        byte_count: s.byte_count,
    })
}

async fn resources(
    req: HttpRequest,
    state: web::Data<Arc<RwLock<SystemState>>>,
    auth_token: web::Data<Option<String>>,
    rate_limiter: web::Data<RateLimiter>,
) -> impl Responder {
    let client_ip = get_client_ip(&req);
    
    if !rate_limiter.check(&client_ip).await {
        warn!("Rate limit exceeded for {}", client_ip);
        return HttpResponse::TooManyRequests().json(ErrorResponse {
            error: "Rate limit exceeded".to_string(),
            code: 429,
        });
    }
    
    if let Err(e) = verify_auth(&req, &auth_token) {
        return HttpResponse::Unauthorized().json(e);
    }
    
    info!("Resources endpoint called");
    
    let s = state.read().await;
    
    HttpResponse::Ok().json(ResourcesResponse {
        cpu_usage: s.cpu_usage,
        memory_usage: s.memory_usage,
        disk_usage: s.disk_usage,
        network_in: s.network_in,
        network_out: s.network_out,
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

impl Clone for RateLimiter {
    fn clone(&self) -> Self {
        Self {
            requests: Arc::clone(&self.requests),
            max_requests: self.max_requests,
            window_secs: self.window_secs,
        }
    }
}
