use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub path: String,
    pub name: String,
    pub created_at: String,
    pub last_opened: String,
}
