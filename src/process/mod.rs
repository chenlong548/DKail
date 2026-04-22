use log::{info, error, warn};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use std::time::Instant;
use std::ops::Deref;

use crate::SystemState;

/// Maximum number of processes to enumerate (safety limit)
const MAX_PROCESS_COUNT: usize = 4096;
/// Maximum process name buffer size
const MAX_PATH: usize = 260;

/// Sanitize path to remove sensitive information like usernames
fn sanitize_path(path: &str) -> String {
    if path.is_empty() {
        return path.to_string();
    }
    
    path.replace(|c: char| c == '\\' || c == '/', "/")
        .split('/')
        .map(|part| {
            if part.len() > 2 && part != "Users" && part != "Program Files" && part != "Program Files (x86)" && part != "Windows" && part != "ProgramData" {
                if part.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-' || c == '.') {
                    if !part.contains('.') && part.len() < 20 {
                        return "***";
                    }
                }
            }
            part
        })
        .collect::<Vec<_>>()
        .join("/")
}

/// Custom error types for process monitoring
#[derive(Debug, thiserror::Error)]
pub enum ProcessError {
    #[error("Failed to enumerate processes: {0}")]
    EnumFailed(String),
    #[error("Invalid bytes returned: expected at most {max}, got {actual}")]
    InvalidBytesReturned { max: usize, actual: usize },
    #[error("Process count exceeds safety limit: {0}")]
    ProcessLimitExceeded(usize),
    #[error("Failed to open process: {0}")]
    OpenFailed(String),
    #[error("Failed to get process info: {0}")]
    InfoFailed(String),
    #[error("Handle operation failed: {0}")]
    HandleError(String),
}

/// RAII wrapper for Windows process handles to ensure proper cleanup
pub struct ProcessHandle {
    handle: *mut winapi::ctypes::c_void,
}

impl ProcessHandle {
    /// Create a new ProcessHandle, taking ownership of the raw handle
    /// 
    /// # Safety
    /// The handle must be a valid Windows process handle or null
    pub unsafe fn new(handle: *mut winapi::ctypes::c_void) -> Self {
        Self { handle }
    }
    
    /// Check if the handle is valid
    pub fn is_valid(&self) -> bool {
        use winapi::um::handleapi::INVALID_HANDLE_VALUE;
        !self.handle.is_null() && self.handle != INVALID_HANDLE_VALUE
    }
    
    /// Get the raw handle pointer
    pub fn as_raw(&self) -> *mut winapi::ctypes::c_void {
        self.handle
    }
}

impl Drop for ProcessHandle {
    fn drop(&mut self) {
        if self.is_valid() {
            unsafe {
                use winapi::um::handleapi::CloseHandle;
                CloseHandle(self.handle);
            }
        }
    }
}

impl Deref for ProcessHandle {
    type Target = *mut winapi::ctypes::c_void;
    
    fn deref(&self) -> &Self::Target {
        &self.handle
    }
}

pub struct ProcessMonitor {
    pub process_cache: HashMap<u32, ProcessInfo>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
}

#[derive(Debug, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub path: String,
    pub parent_pid: u32,
    pub create_time: Instant,
    pub last_update: Instant,
    pub file_operations: Vec<FileOperation>,
    pub network_connections: Vec<NetworkConnection>,
}

#[derive(Debug, Clone)]
pub struct FileOperation {
    pub operation_type: FileOperationType,
    pub path: String,
    pub timestamp: Instant,
}

#[derive(Debug, Clone)]
pub enum FileOperationType {
    Create,
    Read,
    Write,
    Delete,
    Modify,
}

#[derive(Debug, Clone)]
pub struct NetworkConnection {
    pub local_addr: String,
    pub remote_addr: String,
    pub protocol: String,
    pub state: String,
    pub timestamp: Instant,
}

impl ProcessMonitor {
    pub fn new() -> Self {
        Self {
            process_cache: HashMap::new(),
            shutdown_flag: Arc::new(tokio::sync::watch::channel(false).1),
        }
    }
    
    /// Create a ProcessMonitor with a shutdown signal receiver
    pub fn with_shutdown(shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>) -> Self {
        Self {
            process_cache: HashMap::new(),
            shutdown_flag,
        }
    }
    
    pub async fn start_monitoring(&mut self, state: Arc<RwLock<SystemState>>) -> Result<(), ProcessError> {
        info!("Starting process monitoring");
        
        {
            let mut s = state.write().await;
            s.process_monitor_active = true;
        }
        
        self.enumerate_processes()?;
        self.update_system_state(&state).await;
        
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(5));
        let mut shutdown_rx = (*self.shutdown_flag).clone();
        
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    if let Err(e) = self.enumerate_processes() {
                        warn!("Process enumeration error: {}", e);
                    }
                    
                    if let Err(e) = self.check_suspicious_processes() {
                        warn!("Suspicious process check error: {}", e);
                    }
                    
                    self.update_system_state(&state).await;
                }
                _ = shutdown_rx.changed() => {
                    info!("Shutdown signal received, stopping process monitoring");
                    break;
                }
            }
        }
        
        // Clean up state on exit
        {
            let mut s = state.write().await;
            s.process_monitor_active = false;
        }
        
        Ok(())
    }
    
    fn enumerate_processes(&mut self) -> Result<(), ProcessError> {
        use std::mem::size_of;
        use winapi::um::psapi::EnumProcesses;
        
        let mut process_ids: [u32; 1024] = [0; 1024];
        let mut bytes_returned: u32 = 0;
        
        unsafe {
            if EnumProcesses(process_ids.as_mut_ptr(), (1024 * size_of::<u32>()) as u32, &mut bytes_returned) == 0 {
                return Err(ProcessError::EnumFailed("EnumProcesses returned 0".to_string()));
            }
        }
        
        // SECURITY FIX: Validate bytes_returned to prevent buffer overflow
        let max_bytes = 1024 * size_of::<u32>();
        if bytes_returned as usize > max_bytes {
            return Err(ProcessError::InvalidBytesReturned {
                max: max_bytes,
                actual: bytes_returned as usize,
            });
        }
        
        let process_count = bytes_returned as usize / size_of::<u32>();
        
        // SECURITY FIX: Limit process count to prevent resource exhaustion
        if process_count > MAX_PROCESS_COUNT {
            warn!("Process count {} exceeds safety limit {}, truncating", process_count, MAX_PROCESS_COUNT);
            return Err(ProcessError::ProcessLimitExceeded(process_count));
        }
        
        info!("Found {} processes", process_count);
        
        for i in 0..process_count {
            let pid = process_ids[i];
            if pid == 0 {
                continue;
            }
            
            if !self.process_cache.contains_key(&pid) {
                if let Ok(info) = self.get_process_info(pid) {
                    info!("New process detected: {} (PID: {})", info.name, info.pid);
                    self.process_cache.insert(pid, info);
                }
            }
        }
        
        Ok(())
    }
    
    fn get_process_info(&self, pid: u32) -> Result<ProcessInfo, ProcessError> {
        use winapi::um::processthreadsapi::OpenProcess;
        use winapi::um::winbase::QueryFullProcessImageNameW;
        use winapi::um::winnt::PROCESS_QUERY_LIMITED_INFORMATION;
        use winapi::um::psapi::GetModuleFileNameExW;
        use winapi::shared::minwindef::FALSE;
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        
        // SECURITY FIX: Use PROCESS_QUERY_LIMITED_INFORMATION instead of PROCESS_VM_READ
        // This follows the principle of least privilege - we only need to query process info
        let handle = unsafe { OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid) };
        
        // Wrap handle in RAII to ensure cleanup even on error
        let process_handle = unsafe { ProcessHandle::new(handle) };
        
        if !process_handle.is_valid() {
            return Err(ProcessError::OpenFailed(format!("OpenProcess failed for PID {}", pid)));
        }
        
        // Try QueryFullProcessImageNameW first (more reliable on modern Windows)
        let mut module_name: [u16; MAX_PATH] = [0; MAX_PATH];
        let mut size = MAX_PATH as u32;
        
        let path = unsafe {
            // Use QueryFullProcessImageNameW which works with limited permissions
            let result = QueryFullProcessImageNameW(process_handle.as_raw(), 0, module_name.as_mut_ptr(), &mut size);
            
            if result == FALSE {
                // Fallback to GetModuleFileNameExW
                let name_len = GetModuleFileNameExW(process_handle.as_raw(), std::ptr::null_mut(), module_name.as_mut_ptr(), MAX_PATH as u32);
                
                if name_len == 0 {
                    return Err(ProcessError::InfoFailed(format!("GetModuleFileNameExW failed for PID {}", pid)));
                }
                
                OsString::from_wide(&module_name[..name_len as usize])
                    .to_string_lossy()
                    .to_string()
            } else {
                OsString::from_wide(&module_name[..size as usize])
                    .to_string_lossy()
                    .to_string()
            }
        };
        
        let name = std::path::Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());
        
        info!("Successfully retrieved info for process: {} (PID: {})", name, pid);
        
        Ok(ProcessInfo {
            pid,
            name,
            path,
            parent_pid: 0,
            create_time: Instant::now(),
            last_update: Instant::now(),
            file_operations: Vec::new(),
            network_connections: Vec::new(),
        })
    }
    
    fn check_suspicious_processes(&self) -> Result<(), ProcessError> {
        for (pid, info) in &self.process_cache {
            if self.is_suspicious_process(info) {
                warn!("Suspicious process detected: {} (PID: {})", info.name, pid);
            }
        }
        
        Ok(())
    }
    
    fn is_suspicious_process(&self, info: &ProcessInfo) -> bool {
        let suspicious_names = ["mimikatz", "procdump", "lazagne", "hashcat", "john"];
        
        let name_lower = info.name.to_lowercase();
        for suspicious in suspicious_names.iter() {
            if name_lower.contains(suspicious) {
                return true;
            }
        }
        
        false
    }
    
    pub fn get_process_count(&self) -> usize {
        self.process_cache.len()
    }
    
    async fn update_system_state(&self, state: &Arc<RwLock<SystemState>>) {
        let processes: Vec<crate::ProcessSummary> = self.process_cache
            .values()
            .take(100)
            .map(|p| crate::ProcessSummary {
                pid: p.pid,
                name: p.name.clone(),
                path: sanitize_path(&p.path),
                cpu_usage: 0.0,
                memory_usage: 0,
            })
            .collect();
        
        let mut s = state.write().await;
        s.processes = processes;
        s.process_count = self.process_cache.len() as u32;
    }
}

pub async fn start_monitoring(state: Arc<RwLock<SystemState>>) -> Result<(), ProcessError> {
    let mut monitor = ProcessMonitor::new();
    
    match monitor.start_monitoring(state).await {
        Ok(_) => info!("Process monitoring completed"),
        Err(e) => error!("Process monitoring error: {}", e),
    }
    
    Ok(())
}

/// Start monitoring with shutdown signal support
pub async fn start_monitoring_with_shutdown(
    state: Arc<RwLock<SystemState>>,
    shutdown_flag: Arc<tokio::sync::watch::Receiver<bool>>,
) -> Result<(), ProcessError> {
    let mut monitor = ProcessMonitor::with_shutdown(shutdown_flag);
    monitor.start_monitoring(state).await
}
