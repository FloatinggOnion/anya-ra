use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::command;

use crate::types::Paper;

// ─── Save / Load / Delete ───────────────────────────────────────────────────

/// Save paper metadata to {workspace}/papers/{id}/metadata.json
#[command]
pub async fn save_paper(workspace_path: String, paper: Paper) -> Result<(), String> {
    let paper_dir = PathBuf::from(&workspace_path)
        .join("papers")
        .join(&paper.id);

    fs::create_dir_all(&paper_dir)
        .map_err(|e| format!("Failed to create paper dir: {}", e))?;

    let metadata_path = paper_dir.join("metadata.json");
    let json =
        serde_json::to_string_pretty(&paper).map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&metadata_path, json)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(())
}

/// Load all papers from {workspace}/papers/*/metadata.json
#[command]
pub async fn load_papers(workspace_path: String) -> Result<Vec<Paper>, String> {
    let papers_dir = PathBuf::from(&workspace_path).join("papers");

    if !papers_dir.exists() {
        return Ok(vec![]);
    }

    let mut papers = Vec::new();
    let entries = fs::read_dir(&papers_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let metadata_path = entry.path().join("metadata.json");
        if metadata_path.exists() {
            match fs::read_to_string(&metadata_path) {
                Ok(json) => match serde_json::from_str::<Paper>(&json) {
                    Ok(paper) => papers.push(paper),
                    Err(e) => eprintln!("Skipping malformed metadata at {:?}: {}", metadata_path, e),
                },
                Err(e) => eprintln!("Failed to read {:?}: {}", metadata_path, e),
            }
        }
    }

    Ok(papers)
}

/// Delete paper folder entirely
#[command]
pub async fn delete_paper(workspace_path: String, paper_id: String) -> Result<(), String> {
    let paper_dir = PathBuf::from(&workspace_path)
        .join("papers")
        .join(&paper_id);

    if paper_dir.exists() {
        fs::remove_dir_all(&paper_dir)
            .map_err(|e| format!("Failed to delete paper: {}", e))?;
    }

    Ok(())
}

// ─── arXiv search ──────────────────────────────────────────────────────────

// Rate limiter: store last request time as milliseconds since UNIX epoch
static LAST_ARXIV_REQUEST_MS: AtomicU64 = AtomicU64::new(0);

/// Search arXiv with rate limiting (3-second minimum between requests)
#[command]
pub async fn search_arxiv(query: String, max_results: u32) -> Result<Vec<Paper>, String> {
    // Rate limiting: wait at least 3 seconds since last request
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let last_ms = LAST_ARXIV_REQUEST_MS.load(Ordering::Relaxed);
    if last_ms > 0 {
        let elapsed_ms = now_ms.saturating_sub(last_ms);
        if elapsed_ms < 3000 {
            tokio::time::sleep(tokio::time::Duration::from_millis(3000 - elapsed_ms)).await;
        }
    }
    LAST_ARXIV_REQUEST_MS.store(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64,
        Ordering::Relaxed,
    );

    // Build arXiv API URL
    let encoded_query = urlencoding::encode(&query);
    let url = format!(
        "https://export.arxiv.org/api/query?search_query={}&start=0&max_results={}",
        encoded_query, max_results
    );

    // Fetch XML
    let client = reqwest::Client::builder()
        .user_agent("Anya-RA/0.1.0")
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("arXiv request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("arXiv returned status: {}", response.status()));
    }

    let xml = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    parse_arxiv_feed(&xml)
}

/// Parse arXiv Atom feed using quick-xml event reader
fn parse_arxiv_feed(xml: &str) -> Result<Vec<Paper>, String> {
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let mut reader = Reader::from_str(xml);

    let mut papers = Vec::new();
    let mut buf = Vec::new();

    // State
    let mut in_entry = false;
    let mut current_element = String::new();

    // Current entry fields
    let mut id = String::new();
    let mut title = String::new();
    let mut summary = String::new();
    let mut published = String::new();
    let mut authors: Vec<String> = Vec::new();
    let mut current_author = String::new();
    let mut pdf_url: Option<String> = None;

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(e)) => {
                let name = std::str::from_utf8(e.local_name().as_ref())
                    .unwrap_or("")
                    .to_string();

                match name.as_str() {
                    "entry" => {
                        in_entry = true;
                        id.clear();
                        title.clear();
                        summary.clear();
                        published.clear();
                        authors.clear();
                        current_author.clear();
                        pdf_url = None;
                    }
                    "link" if in_entry => {
                        // Check for PDF link attribute
                        let mut href = String::new();
                        let mut link_title = String::new();
                        for attr in e.attributes().flatten() {
                            let key_bytes = attr.key.local_name().as_ref().to_vec();
                            let key = String::from_utf8_lossy(&key_bytes).into_owned();
                            match key.as_str() {
                                "href" => {
                                    href =
                                        String::from_utf8_lossy(&attr.value).into_owned()
                                }
                                "title" => {
                                    link_title =
                                        String::from_utf8_lossy(&attr.value).into_owned()
                                }
                                _ => {}
                            }
                        }
                        if link_title == "pdf" {
                            pdf_url = Some(href);
                        }
                    }
                    _ => {}
                }
                current_element = name;
            }
            Ok(Event::End(e)) => {
                let name = std::str::from_utf8(e.local_name().as_ref())
                    .unwrap_or("")
                    .to_string();

                if name == "entry" && in_entry {
                    let arxiv_id = extract_arxiv_id(&id);
                    let paper_id = format!("arxiv_{}", arxiv_id);
                    let year = extract_year_from_date(&published);
                    let now = chrono::Utc::now().to_rfc3339();

                    let final_pdf_url = pdf_url
                        .clone()
                        .or_else(|| {
                            if !arxiv_id.is_empty() {
                                Some(format!("https://arxiv.org/pdf/{}", arxiv_id))
                            } else {
                                None
                            }
                        });

                    papers.push(Paper {
                        id: paper_id,
                        source: "arxiv".to_string(),
                        external_id: arxiv_id.clone(),
                        title: title.trim().to_string(),
                        authors: authors.clone(),
                        year: Some(year),
                        abstract_text: Some(summary.trim().to_string()),
                        url: format!("https://arxiv.org/abs/{}", arxiv_id),
                        doi: None,
                        arxiv_id: Some(arxiv_id),
                        semantic_id: None,
                        is_open_access: true,
                        open_access_status: Some("green".to_string()),
                        pdf_url: final_pdf_url,
                        local_pdf_path: None,
                        pdf_downloaded: false,
                        imported_at: now.clone(),
                        added_at: now.clone(),
                        last_updated: now,
                        tags: vec![],
                    });

                    in_entry = false;
                }

                if name == "author" && in_entry && !current_author.is_empty() {
                    authors.push(current_author.clone());
                    current_author.clear();
                }

                current_element.clear();
            }
            Ok(Event::Text(e)) => {
                if in_entry {
                    let text = e.unescape().unwrap_or_default().into_owned();
                    match current_element.as_str() {
                        "id" => id = text,
                        "title" => title = text,
                        "summary" => summary = text,
                        "published" => published = text,
                        "name" => current_author = text,
                        _ => {}
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(format!("XML parse error: {}", e)),
            _ => {}
        }
        buf.clear();
    }

    Ok(papers)
}

fn extract_arxiv_id(url: &str) -> String {
    // Extract "2112.05095v1" from "http://arxiv.org/abs/2112.05095v1"
    url.split('/').last().unwrap_or("unknown").to_string()
}

fn extract_year_from_date(date_str: &str) -> i32 {
    // Parse "2021-12-09T18:36:20Z" -> 2021
    date_str
        .split('-')
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(2000)
}

// ─── Local PDF import ──────────────────────────────────────────────────────

/// Import local PDF: copy to workspace and create metadata
#[command]
pub async fn import_local_pdf(
    workspace_path: String,
    file_path: String,
) -> Result<Paper, String> {
    let source_path = Path::new(&file_path);

    if !source_path.exists() {
        return Err("File does not exist".to_string());
    }

    if source_path.extension().and_then(|s| s.to_str()) != Some("pdf") {
        return Err("File must be a PDF".to_string());
    }

    // Generate paper ID from filename
    let filename = source_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");
    let sanitized = sanitize_filename(filename);
    let paper_id = format!("local_{}", sanitized);

    // Create paper folder
    let paper_dir = Path::new(&workspace_path)
        .join("papers")
        .join(&paper_id);
    fs::create_dir_all(&paper_dir)
        .map_err(|e| format!("Failed to create paper dir: {}", e))?;

    // Copy PDF
    let dest_pdf = paper_dir.join("paper.pdf");
    fs::copy(source_path, &dest_pdf)
        .map_err(|e| format!("Failed to copy PDF: {}", e))?;

    // Create metadata (basic info - user can edit later)
    let now = chrono::Utc::now().to_rfc3339();
    let relative_pdf_path = format!("papers/{}/paper.pdf", paper_id);

    let paper = Paper {
        id: paper_id.clone(),
        source: "local".to_string(),
        external_id: filename.to_string(),
        title: filename.to_string(),
        authors: vec![],
        year: None,
        abstract_text: None,
        url: format!("file://{}", dest_pdf.display()),
        doi: None,
        arxiv_id: None,
        semantic_id: None,
        is_open_access: false,
        open_access_status: None,
        pdf_url: None,
        local_pdf_path: Some(relative_pdf_path),
        pdf_downloaded: true,
        imported_at: now.clone(),
        added_at: now.clone(),
        last_updated: now,
        tags: vec![],
    };

    // Save metadata
    let metadata_path = paper_dir.join("metadata.json");
    let json =
        serde_json::to_string_pretty(&paper).map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&metadata_path, json)
        .map_err(|e| format!("Failed to write metadata: {}", e))?;

    Ok(paper)
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .chars()
        .take(50)
        .collect()
}
