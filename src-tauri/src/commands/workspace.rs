use tauri::{AppHandle, Manager, command};
use tauri_plugin_store::StoreExt;
use crate::types::Workspace;

#[command]
pub async fn pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    use tokio::sync::oneshot;

    let (tx, rx) = oneshot::channel::<Option<String>>();

    app.dialog()
        .file()
        .pick_folder(move |folder| {
            let path_str = folder.map(|p| match p {
                FilePath::Path(pb) => pb.to_string_lossy().to_string(),
                FilePath::Url(url) => url.to_string(),
            });
            let _ = tx.send(path_str);
        });

    rx.await.map_err(|e| e.to_string())
}

#[command]
pub async fn save_workspace(app: AppHandle, workspace: Workspace) -> Result<(), String> {
    let store = app.store("workspace.json").map_err(|e| e.to_string())?;
    store.set(
        "workspace",
        serde_json::to_value(&workspace).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
pub async fn load_workspace(app: AppHandle) -> Result<Option<Workspace>, String> {
    let store = app.store("workspace.json").map_err(|e| e.to_string())?;

    match store.get("workspace") {
        Some(value) => {
            let ws: Workspace =
                serde_json::from_value(value.clone()).map_err(|e| e.to_string())?;
            Ok(Some(ws))
        }
        None => Ok(None),
    }
}

#[command]
pub async fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let path = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}
