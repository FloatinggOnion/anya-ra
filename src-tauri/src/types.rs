use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub path: String,
    pub name: String,
    pub created_at: String,
    pub last_opened: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Paper {
    pub id: String,
    pub source: String,
    pub external_id: String,

    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<i32>,
    #[serde(rename = "abstract")]
    pub abstract_text: Option<String>,

    pub url: String,
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub semantic_id: Option<String>,
    pub is_open_access: bool,
    pub open_access_status: Option<String>,
    pub pdf_url: Option<String>,

    pub local_pdf_path: Option<String>,
    pub pdf_downloaded: bool,

    pub imported_at: String,
    pub added_at: String,
    pub last_updated: String,

    pub tags: Vec<String>,
}
