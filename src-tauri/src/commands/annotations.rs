use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tokio::fs;
use crate::workspace_paths::validate_path_under_workspace_anya;

// ─── Data types ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    pub id: String,
    #[serde(rename = "type")]
    pub annotation_type: String,
    pub page: u32,
    pub rects: Vec<Rect>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selected_text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnnotationSidecar {
    pub version: u32,
    pub pdf_hash: String,
    pub annotations: Vec<Annotation>,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Load annotations from the sidecar file alongside a PDF.
/// Returns `None` if no sidecar file exists yet.
#[tauri::command]
pub async fn load_annotations(
    workspace_path: String,
    pdf_path: String,
) -> Result<Option<AnnotationSidecar>, String> {
    let validated_pdf = validate_path_under_workspace_anya(&workspace_path, &pdf_path)?;
    let sidecar_path = sidecar_path_for(validated_pdf.as_path());

    if !sidecar_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(&sidecar_path)
        .await
        .map_err(|e| format!("Failed to read sidecar: {e}"))?;

    let sidecar: AnnotationSidecar = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse annotations JSON: {e}"))?;

    Ok(Some(sidecar))
}

/// Save annotations to the sidecar file alongside a PDF.
/// Creates or overwrites the existing sidecar.
#[tauri::command]
pub async fn save_annotations(
    workspace_path: String,
    pdf_path: String,
    annotations: AnnotationSidecar,
) -> Result<(), String> {
    let validated_pdf = validate_path_under_workspace_anya(&workspace_path, &pdf_path)?;
    let sidecar_path = sidecar_path_for(validated_pdf.as_path());

    // Ensure parent directory exists
    if let Some(parent) = sidecar_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory: {e}"))?;
    }

    let json = serde_json::to_string_pretty(&annotations)
        .map_err(|e| format!("Failed to serialize annotations: {e}"))?;

    fs::write(&sidecar_path, json)
        .await
        .map_err(|e| format!("Failed to write sidecar: {e}"))?;

    Ok(())
}

/// Compute SHA-256 hash of a PDF file.
/// Returns the hash in `sha256:HEX` format.
#[tauri::command]
pub async fn compute_pdf_hash(workspace_path: String, pdf_path: String) -> Result<String, String> {
    let validated_pdf = validate_path_under_workspace_anya(&workspace_path, &pdf_path)?;
    let bytes = fs::read(&validated_pdf)
        .await
        .map_err(|e| format!("Failed to read PDF for hashing: {e}"))?;

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let hash = hasher.finalize();

    Ok(format!("sha256:{:x}", hash))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Derive the sidecar JSON path from a PDF path.
/// E.g. `/papers/foo.pdf` → `/papers/foo.pdf.annotations.json`
fn sidecar_path_for(pdf_path: &std::path::Path) -> PathBuf {
    let mut path = PathBuf::from(pdf_path);
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    path.set_file_name(format!("{}.annotations.json", file_name));
    path
}
