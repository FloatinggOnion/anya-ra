pub mod commands;
pub mod types;
pub mod workspace_paths;

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
            commands::workspace::load_recent_workspaces,
            commands::workspace::add_recent_workspace,
            commands::papers::save_paper,
            commands::papers::load_papers,
            commands::papers::delete_paper,
            commands::papers::search_arxiv,
            commands::papers::search_semantic_scholar,
            commands::papers::import_local_pdf,
            commands::papers::download_pdf,
            commands::keystore::save_api_key,
            commands::keystore::load_api_key,
            commands::chat::save_chat_file,
            commands::chat::load_chat_file,
            commands::chat::list_chat_files,
            commands::annotations::load_annotations,
            commands::annotations::save_annotations,
            commands::annotations::compute_pdf_hash,
            commands::graph::load_graph_file,
            commands::graph::save_graph_file,
            commands::notes::load_notes,
            commands::notes::save_notes,
            commands::migration::check_workspace_needs_migration,
            commands::migration::migrate_workspace_to_anya,
            commands::ui_layout::load_ui_layout_file,
            commands::ui_layout::save_ui_layout_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
