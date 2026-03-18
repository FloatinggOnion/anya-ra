use crate::workspace_paths::get_graph_file;
use tauri::command;

#[command]
pub async fn load_graph_file(workspace_path: String) -> Result<Option<String>, String> {
    let path = get_graph_file(&workspace_path);
    if !path.exists() {
        return Ok(None);
    }
    tokio::fs::read_to_string(&path)
        .await
        .map(Some)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn save_graph_file(workspace_path: String, content: String) -> Result<(), String> {
    let path = get_graph_file(&workspace_path);
    // Create .anya directory if it doesn't exist
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| e.to_string())?;
    }
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}
