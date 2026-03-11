pub mod commands;
pub mod types;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::workspace::pick_folder,
            commands::workspace::save_workspace,
            commands::workspace::load_workspace,
            commands::workspace::get_app_data_dir,
            commands::papers::save_paper,
            commands::papers::load_papers,
            commands::papers::delete_paper,
            commands::papers::search_arxiv,
            commands::papers::import_local_pdf,
            commands::keystore::save_api_key,
            commands::keystore::load_api_key,
            commands::chat::save_chat_file,
            commands::chat::load_chat_file,
            commands::chat::list_chat_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
