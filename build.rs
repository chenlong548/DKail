fn main() {
    match std::env::current_dir() {
        Ok(current_dir) => {
            let wpcap_lib_path = current_dir.join("wpcap_lib");
            println!("cargo:rustc-link-search=native={}", wpcap_lib_path.display());
            println!("cargo:rustc-link-lib=static=wpcap");
            println!("cargo:rustc-link-lib=static=Packet");
            println!("cargo:rerun-if-changed=wpcap_lib/");
        }
        Err(e) => {
            println!("cargo:warning=Failed to get current directory: {}", e);
            std::process::exit(1);
        }
    }
}
