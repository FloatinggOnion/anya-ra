use std::fs;
use std::path::{Path, PathBuf};

fn get_settings_path(workspace_path: &str) -> PathBuf {
    let path = Path::new(workspace_path);
    path.join(".anya").join("settings.json")
}

fn get_telemetry_path(workspace_path: &str) -> PathBuf {
    let path = Path::new(workspace_path);
    path.join(".anya").join("telemetry.json")
}

#[tauri::command]
pub async fn save_settings(workspace_path: String, settings: String) -> Result<(), String> {
    let settings_path = get_settings_path(&workspace_path);

    // Ensure .anya directory exists
    let anya_dir = settings_path.parent().ok_or("Invalid settings path")?;
    fs::create_dir_all(anya_dir).map_err(|e| e.to_string())?;

    // Write settings.json
    fs::write(&settings_path, settings).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn load_settings(workspace_path: String) -> Result<Option<String>, String> {
    let settings_path = get_settings_path(&workspace_path);

    if !settings_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
    Ok(Some(content))
}

#[tauri::command]
pub async fn save_telemetry(workspace_path: String, records: String) -> Result<(), String> {
    let telemetry_path = get_telemetry_path(&workspace_path);

    // Ensure .anya directory exists
    let anya_dir = telemetry_path.parent().ok_or("Invalid telemetry path")?;
    fs::create_dir_all(anya_dir).map_err(|e| e.to_string())?;

    // Write telemetry.json
    fs::write(&telemetry_path, records).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn load_telemetry(workspace_path: String) -> Result<Option<String>, String> {
    let telemetry_path = get_telemetry_path(&workspace_path);

    if !telemetry_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&telemetry_path).map_err(|e| e.to_string())?;
    Ok(Some(content))
}

#[tauri::command]
pub async fn clear_telemetry(workspace_path: String) -> Result<(), String> {
    let telemetry_path = get_telemetry_path(&workspace_path);

    if telemetry_path.exists() {
        fs::remove_file(&telemetry_path).map_err(|e| e.to_string())?;
    }

    Ok(())
}
