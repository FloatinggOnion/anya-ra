use std::fs;
use std::path::PathBuf;

/// Save a chat history JSON file to the workspace's chats directory.
#[tauri::command]
pub fn save_chat_file(
    workspace_path: String,
    chat_id: String,
    content: String,
) -> Result<(), String> {
    let mut chat_dir = PathBuf::from(&workspace_path);
    chat_dir.push("chats");

    // Create chats directory if it doesn't exist
    fs::create_dir_all(&chat_dir)
        .map_err(|e| format!("Failed to create chats directory: {}", e))?;

    chat_dir.push(format!("{}.json", chat_id));

    fs::write(&chat_dir, content).map_err(|e| format!("Failed to write chat file: {}", e))?;

    Ok(())
}

/// Load a chat history JSON file from the workspace's chats directory.
#[tauri::command]
pub fn load_chat_file(workspace_path: String, chat_id: String) -> Result<String, String> {
    let mut chat_path = PathBuf::from(&workspace_path);
    chat_path.push("chats");
    chat_path.push(format!("{}.json", chat_id));

    fs::read_to_string(&chat_path).map_err(|e| format!("Failed to read chat file: {}", e))
}

/// List all chat IDs (filenames without .json extension) in the workspace.
#[tauri::command]
pub fn list_chat_files(workspace_path: String) -> Result<Vec<String>, String> {
    let mut chat_dir = PathBuf::from(&workspace_path);
    chat_dir.push("chats");

    if !chat_dir.exists() {
        return Ok(Vec::new());
    }

    let entries =
        fs::read_dir(&chat_dir).map_err(|e| format!("Failed to read chats directory: {}", e))?;

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
