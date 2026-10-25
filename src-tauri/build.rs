fn main() {
    // Tauri embeds the Dock icon into the development executable.
    println!("cargo:rerun-if-changed=icons");
    tauri_build::build()
}
