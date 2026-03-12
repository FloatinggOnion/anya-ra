use tauri::command;

#[command]
pub async fn load_graph_file(workspace_path: String) -> Result<Option<String>, String> {
    let path = std::path::Path::new(&workspace_path).join("graph.json");
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
    let path = std::path::Path::new(&workspace_path).join("graph.json");
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| e.to_string())
}
