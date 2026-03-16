use std::path::{Component, Path, PathBuf};

pub fn validate_workspace_path(workspace_path: &str) -> Result<PathBuf, String> {
    if workspace_path.trim().is_empty() {
        return Err("workspace path cannot be empty".to_string());
    }
    let path = PathBuf::from(workspace_path);
    if !path.is_absolute() {
        return Err("workspace path must be absolute".to_string());
    }
    if has_parent_dir_component(&path) {
        return Err("workspace path cannot contain parent traversal".to_string());
    }
    Ok(path)
}

pub fn validate_safe_id(id: &str, field_name: &str) -> Result<(), String> {
    if id.trim().is_empty() {
        return Err(format!("{field_name} cannot be empty"));
    }
    if id.contains('/') || id.contains('\\') || id.contains("..") {
        return Err(format!("{field_name} contains invalid path characters"));
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err(format!("{field_name} contains unsupported characters"));
    }
    Ok(())
}

pub fn validate_path_under_workspace_anya(
    workspace_path: &str,
    target_path: &str,
) -> Result<PathBuf, String> {
    let workspace = validate_workspace_path(workspace_path)?;
    let target = PathBuf::from(target_path);

    if !target.is_absolute() {
        return Err("target path must be absolute".to_string());
    }
    if has_parent_dir_component(&target) {
        return Err("target path cannot contain parent traversal".to_string());
    }

    let anya_root = workspace.join(".anya");
    if !target.starts_with(&anya_root) {
        return Err("target path must be inside workspace .anya directory".to_string());
    }

    Ok(target)
}

fn has_parent_dir_component(path: &Path) -> bool {
    path.components().any(|c| matches!(c, Component::ParentDir))
}

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
