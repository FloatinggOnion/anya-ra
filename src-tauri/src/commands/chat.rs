use crate::workspace_paths::{get_chat_dir, validate_safe_id, validate_workspace_path};
use std::fs;

/// Save a chat history JSON file to the workspace's .anya/chat directory.
#[tauri::command]
pub fn save_chat_file(
    workspace_path: String,
    chat_id: String,
    content: String,
) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&chat_id, "chat_id")?;
    let chat_dir = get_chat_dir(&workspace_path);

    // Create chat directory if it doesn't exist
    fs::create_dir_all(&chat_dir).map_err(|e| format!("Failed to create chat directory: {}", e))?;

    let chat_path = chat_dir.join(format!("{}.json", chat_id));

    fs::write(&chat_path, content).map_err(|e| format!("Failed to write chat file: {}", e))?;

    Ok(())
}

/// Load a chat history JSON file from the workspace's .anya/chat directory.
#[tauri::command]
pub fn load_chat_file(workspace_path: String, chat_id: String) -> Result<String, String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&chat_id, "chat_id")?;
    let chat_path = get_chat_dir(&workspace_path).join(format!("{}.json", chat_id));

    fs::read_to_string(&chat_path).map_err(|e| format!("Failed to read chat file: {}", e))
}

/// List all chat IDs (filenames without .json extension) in the workspace.
#[tauri::command]
pub fn list_chat_files(workspace_path: String) -> Result<Vec<String>, String> {
    validate_workspace_path(&workspace_path)?;
    let chat_dir = get_chat_dir(&workspace_path);

    if !chat_dir.exists() {
        return Ok(Vec::new());
    }

    let entries =
        fs::read_dir(&chat_dir).map_err(|e| format!("Failed to read chat directory: {}", e))?;

    let mut chat_ids = Vec::new();
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            if name.ends_with(".json") {
                let id = name.trim_end_matches(".json").to_string();
                chat_ids.push(id);
            }
        }
    }

    Ok(chat_ids)
}
