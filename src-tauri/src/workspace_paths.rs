use std::path::PathBuf;

/// Get the .anya folder path for a workspace
/// Converts {workspace_path} to {workspace_path}/.anya
pub fn get_anya_path(workspace_path: &str) -> PathBuf {
    PathBuf::from(workspace_path).join(".anya")
}

/// Get the papers directory path
pub fn get_papers_dir(workspace_path: &str) -> PathBuf {
    get_anya_path(workspace_path).join("papers")
}

/// Get the notes directory path  
pub fn get_notes_dir(workspace_path: &str) -> PathBuf {
    get_anya_path(workspace_path).join("notes")
}

/// Get the graph file path
pub fn get_graph_file(workspace_path: &str) -> PathBuf {
    get_anya_path(workspace_path).join("graph.json")
}

/// Get the chat directory path
pub fn get_chat_dir(workspace_path: &str) -> PathBuf {
    get_anya_path(workspace_path).join("chat")
}

/// Get the annotations directory path
pub fn get_annotations_dir(workspace_path: &str) -> PathBuf {
    get_anya_path(workspace_path).join("annotations")
}
