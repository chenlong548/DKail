use std::mem::size_of;
use winapi::um::sysinfoapi::{GlobalMemoryStatusEx, MEMORYSTATUSEX};
use winapi::um::fileapi::GetDiskFreeSpaceExW;
use winapi::um::processthreadsapi::GetSystemTimes;
use winapi::shared::ntdef::ULARGE_INTEGER;

#[derive(Debug, Clone, serde::Serialize)]
pub struct SystemResources {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
    pub network_in: u64,
    pub network_out: u64,
}

pub struct SystemMonitor {
    last_idle_time: u64,
    last_kernel_time: u64,
    last_user_time: u64,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            last_idle_time: 0,
            last_kernel_time: 0,
            last_user_time: 0,
        }
    }

    pub fn get_resources(&mut self) -> SystemResources {
        SystemResources {
            cpu_usage: self.get_cpu_usage(),
            memory_usage: self.get_memory_usage(),
            disk_usage: self.get_disk_usage(),
            network_in: 0,
            network_out: 0,
        }
    }

    fn get_cpu_usage(&mut self) -> f32 {
        unsafe {
            let mut idle_time: ULARGE_INTEGER = std::mem::zeroed();
            let mut kernel_time: ULARGE_INTEGER = std::mem::zeroed();
            let mut user_time: ULARGE_INTEGER = std::mem::zeroed();

            let result = GetSystemTimes(
                &mut idle_time as *mut _ as *mut _,
                &mut kernel_time as *mut _ as *mut _,
                &mut user_time as *mut _ as *mut _,
            );

            if result == 0 {
                return 0.0;
            }

            let idle = *idle_time.QuadPart();
            let kernel = *kernel_time.QuadPart();
            let user = *user_time.QuadPart();

            if self.last_idle_time == 0 {
                self.last_idle_time = idle;
                self.last_kernel_time = kernel;
                self.last_user_time = user;
                return 0.0;
            }

            let idle_diff = idle.saturating_sub(self.last_idle_time);
            let kernel_diff = kernel.saturating_sub(self.last_kernel_time);
            let user_diff = user.saturating_sub(self.last_user_time);

            self.last_idle_time = idle;
            self.last_kernel_time = kernel;
            self.last_user_time = user;

            let total = kernel_diff + user_diff;
            if total == 0 {
                return 0.0;
            }

            let cpu_usage = ((total - idle_diff) as f64 / total as f64 * 100.0) as f32;
            cpu_usage.max(0.0).min(100.0)
        }
    }

    fn get_memory_usage(&self) -> f32 {
        unsafe {
            let mut status: MEMORYSTATUSEX = std::mem::zeroed();
            status.dwLength = size_of::<MEMORYSTATUSEX>() as u32;

            if GlobalMemoryStatusEx(&mut status) == 0 {
                return 0.0;
            }

            status.dwMemoryLoad as f32
        }
    }

    fn get_disk_usage(&self) -> f32 {
        unsafe {
            let mut free_bytes: ULARGE_INTEGER = std::mem::zeroed();
            let mut total_bytes: ULARGE_INTEGER = std::mem::zeroed();
            let mut available_bytes: ULARGE_INTEGER = std::mem::zeroed();

            let path: Vec<u16> = "C:\\".encode_utf16().chain(std::iter::once(0)).collect();

            let result = GetDiskFreeSpaceExW(
                path.as_ptr(),
                &mut free_bytes as *mut _ as *mut _,
                &mut total_bytes as *mut _ as *mut _,
                &mut available_bytes as *mut _ as *mut _,
            );

            if result == 0 {
                return 0.0;
            }

            let total = *total_bytes.QuadPart();
            let free = *free_bytes.QuadPart();

            if total == 0 {
                return 0.0;
            }

            let used = total - free;
            ((used as f64 / total as f64) * 100.0) as f32
        }
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}
