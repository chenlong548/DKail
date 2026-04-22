fn main() {
    let wpcap_lib_path = std::env::current_dir().unwrap().join("wpcap_lib");
    println!("cargo:rustc-link-search=native={}", wpcap_lib_path.display());
    println!("cargo:rustc-link-lib=static=wpcap");
    println!("cargo:rustc-link-lib=static=Packet");
    println!("cargo:rerun-if-changed=wpcap_lib/");
}
