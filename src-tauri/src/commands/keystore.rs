use tauri_plugin_store::StoreExt;

/// Save an API key to the encrypted keystore.
#[tauri::command]
pub fn save_api_key(app: tauri::AppHandle, service: String, api_key: String) -> Result<(), String> {
    let store = app
        .store("keystore.json")
        .map_err(|e| format!("Failed to access keystore: {}", e))?;

    let key = format!("api_key_{}", service);
    store.set(key, api_key);
    store.save().map_err(|e| format!("Failed to persist keystore: {}", e))?;

    Ok(())
}

/// Load an API key from the encrypted keystore.
#[tauri::command]
pub fn load_api_key(app: tauri::AppHandle, service: String) -> Result<Option<String>, String> {
    let store = app
        .store("keystore.json")
        .map_err(|e| format!("Failed to access keystore: {}", e))?;

    let key = format!("api_key_{}", service);
    Ok(store.get(&key).and_then(|v| v.as_str().map(String::from)))
}
