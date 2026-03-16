use std::fs;
use crate::workspace_paths::{get_notes_dir, validate_safe_id, validate_workspace_path};

/// Load notes for a specific paper from {workspace_path}/.anya/notes/{paper_id}.json.
///
/// Returns `Err` if file doesn't exist — TypeScript maps this to `null`.
/// If file exists but is invalid JSON, returns error.
///
/// Called from TypeScript: `invoke('load_notes', { workspacePath, paperId })`
#[tauri::command]
pub fn load_notes(workspace_path: String, paper_id: String) -> Result<String, String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&paper_id, "paper_id")?;
    let notes_path = get_notes_dir(&workspace_path)
        .join(format!("{}.json", paper_id));

    if !notes_path.exists() {
        return Err("Notes file not found".to_string());
    }

    fs::read_to_string(&notes_path)
        .map_err(|e| format!("Failed to read notes: {}", e))
}

/// Save notes for a specific paper to {workspace_path}/.anya/notes/{paper_id}.json.
///
/// Creates the notes directory if it doesn't exist.
/// Overwrites existing notes file.
///
/// Called from TypeScript: `invoke('save_notes', { workspacePath, paperId, content })`
#[tauri::command]
pub fn save_notes(workspace_path: String, paper_id: String, content: String) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&paper_id, "paper_id")?;
    let notes_dir = get_notes_dir(&workspace_path);

    // Create notes directory if missing
    fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;

    let notes_path = notes_dir.join(format!("{}.json", paper_id));

    fs::write(&notes_path, &content)
        .map_err(|e| format!("Failed to write notes: {}", e))
}
