use tauri::{command, AppHandle};
use tauri_plugin_store::StoreExt;

#[command]
pub async fn get_settings(app: AppHandle) -> Result<Option<serde_json::Value>, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    Ok(store.get("settings"))
}

#[command]
pub async fn set_settings(app: AppHandle, settings: serde_json::Value) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("settings", settings);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}
