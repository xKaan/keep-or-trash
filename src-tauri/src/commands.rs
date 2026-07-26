use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize)]
pub struct PhotoInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
}

const TRASH_DIR: &str = "trash";

fn mime_for(path: &Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_lowercase().as_str() {
        "jpg" | "jpeg" => Some("image/jpeg"),
        "png" => Some("image/png"),
        "webp" => Some("image/webp"),
        _ => None,
    }
}

fn trash_dir(folder: &str) -> PathBuf {
    Path::new(folder).join(TRASH_DIR)
}

fn plain_file_name(filename: &str) -> Result<&str, String> {
    let is_plain = Path::new(filename)
        .file_name()
        .is_some_and(|name| name == filename);
    if is_plain {
        Ok(filename)
    } else {
        Err(format!("Nom de fichier invalide : {filename}"))
    }
}

fn read_photos(dir: &Path) -> Result<Vec<PhotoInfo>, String> {
    let entries =
        fs::read_dir(dir).map_err(|e| format!("Impossible de lire le dossier : {e}"))?;

    let mut photos: Vec<PhotoInfo> = entries
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name();
            mime_for(Path::new(&name))?;

            let path = entry.path();
            let metadata = fs::metadata(&path).ok()?;
            if !metadata.is_file() {
                return None;
            }

            Some(PhotoInfo {
                name: name.to_string_lossy().into_owned(),
                path: path.to_string_lossy().into_owned(),
                size: metadata.len(),
            })
        })
        .collect();

    photos.sort_unstable_by(|a, b| a.name.cmp(&b.name));
    Ok(photos)
}

#[tauri::command(async)]
pub fn list_photos(folder: String) -> Result<Vec<PhotoInfo>, String> {
    read_photos(Path::new(&folder))
}

#[tauri::command(async)]
pub fn list_trash(folder: String) -> Result<Vec<PhotoInfo>, String> {
    let trash = trash_dir(&folder);
    if !trash.is_dir() {
        return Ok(Vec::new());
    }
    read_photos(&trash)
}

#[tauri::command(async)]
pub fn delete_permanently(folder: String, filenames: Vec<String>) -> Result<usize, String> {
    let trash = trash_dir(&folder);
    let mut deleted = 0;
    for filename in &filenames {
        let name = plain_file_name(filename)?;
        fs::remove_file(trash.join(name))
            .map_err(|e| format!("Impossible de supprimer {name} : {e}"))?;
        deleted += 1;
    }
    Ok(deleted)
}

#[tauri::command]
pub fn move_to_trash(folder: String, filename: String) -> Result<(), String> {
    let source = Path::new(&folder).join(&filename);
    let trash = trash_dir(&folder);
    fs::create_dir_all(&trash)
        .map_err(|e| format!("Impossible de créer le dossier trash : {e}"))?;

    let dest = unique_destination(&trash, &filename);
    fs::rename(&source, &dest).map_err(|e| format!("Impossible de déplacer le fichier : {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn undo_move(folder: String, filename: String) -> Result<(), String> {
    let source = trash_dir(&folder).join(&filename);
    let dest = Path::new(&folder).join(&filename);
    fs::rename(&source, &dest).map_err(|e| format!("Impossible de restaurer le fichier : {e}"))?;
    Ok(())
}

fn unique_destination(dir: &Path, filename: &str) -> PathBuf {
    let path = Path::new(filename);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(filename);
    let suffix = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{e}"))
        .unwrap_or_default();

    let mut candidate = dir.join(filename);
    let mut counter = 0;
    while candidate.exists() {
        counter += 1;
        candidate = dir.join(format!("{stem}_{counter}{suffix}"));
    }
    candidate
}

#[tauri::command(async)]
pub fn read_photo(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    let mime = mime_for(path).ok_or_else(|| {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase())
            .unwrap_or_default();
        format!("Format non supporté : {ext}")
    })?;

    let bytes = fs::read(path).map_err(|e| format!("Impossible de lire le fichier : {e}"))?;

    let mut data_url = String::with_capacity(13 + mime.len() + bytes.len().div_ceil(3) * 4);
    data_url.push_str("data:");
    data_url.push_str(mime);
    data_url.push_str(";base64,");
    general_purpose::STANDARD.encode_string(&bytes, &mut data_url);
    Ok(data_url)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn s(path: &Path) -> String {
        path.to_string_lossy().into_owned()
    }

    fn create_file(dir: &Path, name: &str) -> PathBuf {
        let path = dir.join(name);
        fs::write(&path, b"fake image data").unwrap();
        path
    }

    fn create_in_trash(dir: &Path, name: &str) -> PathBuf {
        let trash = dir.join(TRASH_DIR);
        fs::create_dir_all(&trash).unwrap();
        create_file(&trash, name)
    }

    #[test]
    fn list_photos_returns_only_supported_formats_sorted() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "b.png");
        create_file(dir.path(), "a.jpg");
        create_file(dir.path(), "notes.txt");

        let result = list_photos(s(dir.path())).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "a.jpg");
        assert_eq!(result[1].name, "b.png");
    }

    #[test]
    fn list_photos_errors_on_missing_folder() {
        let result = list_photos("/nonexistent/path/for/sure".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn move_to_trash_moves_file_into_trash_subfolder() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "photo.jpg");

        move_to_trash(s(dir.path()), "photo.jpg".to_string()).unwrap();

        assert!(!dir.path().join("photo.jpg").exists());
        assert!(dir.path().join(TRASH_DIR).join("photo.jpg").exists());
    }

    #[test]
    fn move_to_trash_avoids_overwriting_existing_file_in_trash() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "photo.jpg");
        create_in_trash(dir.path(), "photo.jpg");

        move_to_trash(s(dir.path()), "photo.jpg".to_string()).unwrap();

        assert!(dir.path().join(TRASH_DIR).join("photo_1.jpg").exists());
    }

    #[test]
    fn undo_move_restores_file_from_trash() {
        let dir = tempdir().unwrap();
        create_in_trash(dir.path(), "photo.jpg");

        undo_move(s(dir.path()), "photo.jpg".to_string()).unwrap();

        assert!(dir.path().join("photo.jpg").exists());
        assert!(!dir.path().join(TRASH_DIR).join("photo.jpg").exists());
    }

    #[test]
    fn list_trash_returns_photos_from_the_trash_subfolder() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "kept.jpg");
        create_in_trash(dir.path(), "b.png");
        create_in_trash(dir.path(), "a.jpg");

        let result = list_trash(s(dir.path())).unwrap();

        assert_eq!(result.len(), 2);
        assert_eq!(result[0].name, "a.jpg");
        assert_eq!(result[1].name, "b.png");
    }

    #[test]
    fn list_trash_is_empty_when_no_trash_folder_exists() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "kept.jpg");

        let result = list_trash(s(dir.path())).unwrap();

        assert!(result.is_empty());
    }

    #[test]
    fn delete_permanently_removes_the_named_files_and_counts_them() {
        let dir = tempdir().unwrap();
        create_in_trash(dir.path(), "a.jpg");
        create_in_trash(dir.path(), "b.jpg");
        create_in_trash(dir.path(), "c.jpg");

        let deleted =
            delete_permanently(s(dir.path()), vec!["a.jpg".to_string(), "c.jpg".to_string()])
                .unwrap();

        assert_eq!(deleted, 2);
        assert!(!dir.path().join(TRASH_DIR).join("a.jpg").exists());
        assert!(dir.path().join(TRASH_DIR).join("b.jpg").exists());
        assert!(!dir.path().join(TRASH_DIR).join("c.jpg").exists());
    }

    #[test]
    fn delete_permanently_never_escapes_the_trash_folder() {
        let dir = tempdir().unwrap();
        create_file(dir.path(), "precious.jpg");
        create_in_trash(dir.path(), "a.jpg");

        let result = delete_permanently(s(dir.path()), vec!["../precious.jpg".to_string()]);

        assert!(result.is_err());
        assert!(dir.path().join("precious.jpg").exists());
    }

    #[test]
    fn delete_permanently_reports_a_missing_file() {
        let dir = tempdir().unwrap();
        create_in_trash(dir.path(), "a.jpg");

        let result = delete_permanently(s(dir.path()), vec!["ghost.jpg".to_string()]);

        assert!(result.is_err());
    }

    #[test]
    fn read_photo_returns_base64_data_url() {
        let dir = tempdir().unwrap();
        let photo = create_file(dir.path(), "photo.jpg");

        let result = read_photo(s(&photo)).unwrap();

        assert!(result.starts_with("data:image/jpeg;base64,"));
    }

    #[test]
    fn read_photo_rejects_unsupported_extension() {
        let dir = tempdir().unwrap();
        let notes = create_file(dir.path(), "notes.txt");

        let result = read_photo(s(&notes));

        assert!(result.is_err());
    }
}
