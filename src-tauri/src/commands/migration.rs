use std::fs;
use std::path::Path;
use tauri::command;
use crate::workspace_paths::{get_anya_path, get_papers_dir, get_notes_dir, get_chat_dir};

/// Check if workspace needs migration (has data in root instead of .anya/)
#[command]
pub fn check_workspace_needs_migration(workspace_path: String) -> Result<bool, String> {
    let workspace = Path::new(&workspace_path);
    
    // Check if any old folders exist
    let has_old_papers = workspace.join("papers").exists();
    let has_old_notes = workspace.join("notes").exists();
    let has_old_chats = workspace.join("chats").exists();
    let has_old_graph = workspace.join("graph.json").exists();
    
    // Check if new .anya folder doesn't exist yet
    let has_no_anya = !get_anya_path(&workspace_path).exists();
    
    // Needs migration if we have old data AND no .anya folder
    let needs_migration = (has_old_papers || has_old_notes || has_old_chats || has_old_graph) && has_no_anya;
    
    Ok(needs_migration)
}

/// Migrate workspace from root folder to .anya/ subfolder
#[command]
pub fn migrate_workspace_to_anya(workspace_path: String) -> Result<(), String> {
    let workspace = Path::new(&workspace_path);
    let anya_path = get_anya_path(&workspace_path);
    
    // Create .anya folder if needed
    fs::create_dir_all(&anya_path)
        .map_err(|e| format!("Failed to create .anya folder: {}", e))?;
    
    // Migrate papers folder
    let old_papers = workspace.join("papers");
    if old_papers.exists() {
        let new_papers = get_papers_dir(&workspace_path);
        if !new_papers.exists() {
            fs::rename(&old_papers, &new_papers)
                .map_err(|e| format!("Failed to migrate papers folder: {}", e))?;
        }
    }
    
    // Migrate notes folder
    let old_notes = workspace.join("notes");
    if old_notes.exists() {
        let new_notes = get_notes_dir(&workspace_path);
        if !new_notes.exists() {
            fs::rename(&old_notes, &new_notes)
                .map_err(|e| format!("Failed to migrate notes folder: {}", e))?;
        }
    }
    
    // Migrate chats folder
    let old_chats = workspace.join("chats");
    if old_chats.exists() {
        let new_chat = get_chat_dir(&workspace_path);
        if !new_chat.exists() {
            fs::rename(&old_chats, &new_chat)
                .map_err(|e| format!("Failed to migrate chat folder: {}", e))?;
        }
    }
    
    // Migrate graph.json
    let old_graph = workspace.join("graph.json");
    if old_graph.exists() {
        let new_graph = crate::workspace_paths::get_graph_file(&workspace_path);
        if !new_graph.exists() {
            fs::rename(&old_graph, &new_graph)
                .map_err(|e| format!("Failed to migrate graph.json: {}", e))?;
        }
    }
    
    println!("[migration] Successfully migrated workspace to .anya folder structure");
    Ok(())
}
