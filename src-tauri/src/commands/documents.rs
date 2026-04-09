use crate::workspace_paths::{get_documents_dir, validate_safe_id, validate_workspace_path};
use serde::{Deserialize, Serialize};
use std::fs;

/// Document type returned from Rust (matches TypeScript Document interface)
#[derive(Debug, Serialize, Deserialize)]
pub struct Document {
    id: String,
    title: String,
    content: String,
    #[serde(rename = "createdAt")]
    created_at: String,
    #[serde(rename = "updatedAt")]
    updated_at: String,
}

/// Load a document from {workspace}/documents/{doc_id}.md.
///
/// Returns `Err` if file doesn't exist — TypeScript maps this to `null`.
/// If file exists, returns Document with metadata parsed from sidecar.
///
/// Called from TypeScript: `invoke('load_document', { workspacePath, docId })`
#[tauri::command]
pub fn load_document(workspace_path: String, doc_id: String) -> Result<Document, String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&doc_id, "doc_id")?;
    let docs_dir = get_documents_dir(&workspace_path);
    let doc_path = docs_dir.join(format!("{}.md", doc_id));

    if !doc_path.exists() {
        return Err("Document not found".to_string());
    }

    // Read markdown content
    let content = fs::read_to_string(&doc_path)
        .map_err(|e| format!("Failed to read document: {}", e))?;

    // Load sidecar for metadata
    let sidecar_path = docs_dir.join(format!("{}.links.json", doc_id));
    let (title, created_at, updated_at) = if sidecar_path.exists() {
        let sidecar_content = fs::read_to_string(&sidecar_path)
            .map_err(|e| format!("Failed to read sidecar: {}", e))?;
        let sidecar: serde_json::Value = serde_json::from_str(&sidecar_content)
            .map_err(|e| format!("Invalid sidecar JSON: {}", e))?;

        let title = sidecar["title"]
            .as_str()
            .unwrap_or(&doc_id)
            .to_string();
        let created = sidecar["created"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let modified = sidecar["modified"]
            .as_str()
            .unwrap_or("")
            .to_string();

        (title, created, modified)
    } else {
        // No sidecar yet; use defaults
        let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
        (doc_id.clone(), now.clone(), now)
    };

    Ok(Document {
        id: doc_id,
        title,
        content,
        created_at,
        updated_at,
    })
}

/// Load document sidecar metadata from {workspace}/documents/{doc_id}.links.json.
///
/// Returns `Err` if file doesn't exist — TypeScript maps this to `null`.
///
/// Called from TypeScript: `invoke('load_document_sidecar', { workspacePath, docId })`
#[tauri::command]
pub fn load_document_sidecar(workspace_path: String, doc_id: String) -> Result<String, String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&doc_id, "doc_id")?;
    let sidecar_path = get_documents_dir(&workspace_path).join(format!("{}.links.json", doc_id));

    if !sidecar_path.exists() {
        return Err("Document sidecar not found".to_string());
    }

    fs::read_to_string(&sidecar_path)
        .map_err(|e| format!("Failed to read sidecar: {}", e))
}

/// Save a document to {workspace}/documents/{doc_id}.md.
///
/// Creates the documents directory if it doesn't exist.
/// Overwrites existing document file.
///
/// Called from TypeScript: `invoke('save_document', { workspacePath, docId, content })`
#[tauri::command]
pub fn save_document(
    workspace_path: String,
    doc_id: String,
    content: String,
) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&doc_id, "doc_id")?;
    let docs_dir = get_documents_dir(&workspace_path);

    // Create documents directory if missing
    fs::create_dir_all(&docs_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

    let doc_path = docs_dir.join(format!("{}.md", doc_id));

    fs::write(&doc_path, &content).map_err(|e| format!("Failed to write document: {}", e))
}

/// Save document sidecar to {workspace}/documents/{doc_id}.links.json.
///
/// Creates the documents directory if it doesn't exist.
/// Overwrites existing sidecar file.
///
/// Called from TypeScript: `invoke('save_document_sidecar', { workspacePath, docId, content })`
#[tauri::command]
pub fn save_document_sidecar(
    workspace_path: String,
    doc_id: String,
    content: String,
) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&doc_id, "doc_id")?;
    let docs_dir = get_documents_dir(&workspace_path);

    // Create documents directory if missing
    fs::create_dir_all(&docs_dir)
        .map_err(|e| format!("Failed to create documents directory: {}", e))?;

    let sidecar_path = docs_dir.join(format!("{}.links.json", doc_id));

    fs::write(&sidecar_path, &content)
        .map_err(|e| format!("Failed to write sidecar: {}", e))
}

/// Delete a document and its sidecar.
///
/// Removes both {doc_id}.md and {doc_id}.links.json.
/// Returns silently if files don't exist.
///
/// Called from TypeScript: `invoke('delete_document', { workspacePath, docId })`
#[tauri::command]
pub fn delete_document(workspace_path: String, doc_id: String) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&doc_id, "doc_id")?;
    let docs_dir = get_documents_dir(&workspace_path);

    let doc_path = docs_dir.join(format!("{}.md", doc_id));
    let sidecar_path = docs_dir.join(format!("{}.links.json", doc_id));

    // Delete document file if it exists
    if doc_path.exists() {
        fs::remove_file(&doc_path)
            .map_err(|e| format!("Failed to delete document: {}", e))?;
    }

    // Delete sidecar if it exists
    if sidecar_path.exists() {
        fs::remove_file(&sidecar_path)
            .map_err(|e| format!("Failed to delete sidecar: {}", e))?;
    }

    Ok(())
}

/// List all document IDs in the workspace.
///
/// Returns array of docIds (filenames without .md extension) from {workspace}/documents/
/// Returns empty array if directory doesn't exist.
///
/// Called from TypeScript: `invoke('list_documents', { workspacePath })`
#[tauri::command]
pub fn list_documents(workspace_path: String) -> Result<Vec<String>, String> {
    validate_workspace_path(&workspace_path)?;
    let docs_dir = get_documents_dir(&workspace_path);

    if !docs_dir.exists() {
        return Ok(Vec::new());
    }

    let mut doc_ids = Vec::new();
    let entries = fs::read_dir(&docs_dir)
        .map_err(|e| format!("Failed to read documents directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        // Only process .md files (not .links.json)
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            if let Some(file_name) = path.file_stem() {
                if let Some(id) = file_name.to_str() {
                    doc_ids.push(id.to_string());
                }
            }
        }
    }

    doc_ids.sort();
    Ok(doc_ids)
}

/// Rename a document by renaming both content and sidecar files.
///
/// Renames {old_doc_id}.md to {new_doc_id}.md and sidecars accordingly.
/// Returns silently if files don't exist.
///
/// Called from TypeScript: `invoke('rename_document', { workspacePath, oldDocId, newDocId })`
#[tauri::command]
pub fn rename_document(
    workspace_path: String,
    old_doc_id: String,
    new_doc_id: String,
) -> Result<(), String> {
    validate_workspace_path(&workspace_path)?;
    validate_safe_id(&old_doc_id, "old_doc_id")?;
    validate_safe_id(&new_doc_id, "new_doc_id")?;
    let docs_dir = get_documents_dir(&workspace_path);

    let old_doc_path = docs_dir.join(format!("{}.md", old_doc_id));
    let new_doc_path = docs_dir.join(format!("{}.md", new_doc_id));
    let old_sidecar_path = docs_dir.join(format!("{}.links.json", old_doc_id));
    let new_sidecar_path = docs_dir.join(format!("{}.links.json", new_doc_id));

    // Rename document if it exists
    if old_doc_path.exists() {
        fs::rename(&old_doc_path, &new_doc_path)
            .map_err(|e| format!("Failed to rename document: {}", e))?;
    }

    // Rename sidecar if it exists
    if old_sidecar_path.exists() {
        fs::rename(&old_sidecar_path, &new_sidecar_path)
            .map_err(|e| format!("Failed to rename sidecar: {}", e))?;
    }

    Ok(())
}
