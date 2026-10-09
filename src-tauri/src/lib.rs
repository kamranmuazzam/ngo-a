use rusqlite::{Connection, Result, params, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::Manager;
use argon2::{
    password_hash::{
        phc::PasswordHash, PasswordHasher, PasswordVerifier
    },
    Argon2
};


#[derive(Debug, Serialize, Deserialize, Clone)]
struct School {
    id: Option<String>,
    school_name: String,
    province: String,
    district: String,
    local_level: String,
    principal_name: String,
    email_id: String,
    clec_established_year: String,
    clec_category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Teacher {
    id: Option<String>,
    teacher_id: String,
    gender: String,
    school_name: String,
    school_district: String,
    status: String,
    email: String,
    contact: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Student {
    id: Option<String>,
    student_id: String,
    gender: String,
    school_name: String,
    grade: String,
    academic_year: String,
    school_district: String,
    category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Training {
    id: Option<String>,
    training_title: String,
    credit_course: String,
    start_date: String,
    end_date: String,
    participant_name: String,
    school_name: String,
    email_id: String,
}

struct AppState {
    db: Mutex<Connection>,
}

fn hash_password(password: &str) -> String {
    let argon2 = Argon2::default();
    argon2.hash_password(password.as_bytes()).unwrap().to_string()
}


fn verify_password(hash: &str, password: &str) -> bool {
    let parsed_hash = PasswordHash::new(hash).unwrap();
    Argon2::default().verify_password(password.as_bytes(), &parsed_hash).is_ok()
}

fn init_db<P: AsRef<std::path::Path>>(db_path: P) -> Result<Connection> {
    let conn = Connection::open(db_path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS school (
            id TEXT PRIMARY KEY,
            school_name TEXT NOT NULL,
            province TEXT NOT NULL,
            district TEXT NOT NULL,
            local_level TEXT NOT NULL,
            principal_name TEXT NOT NULL,
            email_id TEXT NOT NULL,
            clec_established_year TEXT NOT NULL,
            clec_category TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS teacher (
            id TEXT PRIMARY KEY,
            teacher_id TEXT NOT NULL,
            gender TEXT NOT NULL,
            school_name TEXT NOT NULL,
            school_district TEXT NOT NULL,
            status TEXT NOT NULL,
            email TEXT NOT NULL,
            contact TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS student (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            gender TEXT NOT NULL,
            school_name TEXT NOT NULL,
            grade TEXT NOT NULL,
            academic_year TEXT NOT NULL,
            school_district TEXT NOT NULL,
            category TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS training (
            id TEXT PRIMARY KEY,
            training_title TEXT NOT NULL,
            credit_course TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            participant_name TEXT NOT NULL,
            school_name TEXT NOT NULL,
            email_id TEXT NOT NULL
        )",
        [],
    )?;

    // Decentralization and Auth Tables
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            require_password_change BOOLEAN NOT NULL DEFAULT 1
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY,
            pubkey TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            user_id TEXT,
            authorized_by TEXT,
            role TEXT NOT NULL,
            status TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS sync_log (
            id TEXT PRIMARY KEY,
            table_name TEXT NOT NULL,
            record_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            data TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS node_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )",
        [],
    )?;

    // Bootstrap admin account
    let admin_exists: bool = conn.query_row(
        "SELECT 1 FROM users WHERE username = 'admin'",
        [],
        |_| Ok(true),
    ).optional()?.unwrap_or(false);

    if !admin_exists {
        let admin_id = uuid::Uuid::new_v4().to_string();
        let hash = hash_password("turing");
        conn.execute(
            "INSERT INTO users (id, username, password_hash, role, require_password_change) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![admin_id, "admin", hash, "administrator", true],
        )?;
    }


    Ok(conn)
}

// ------ NETWORK ------
#[derive(Serialize)]
struct NetworkInfo {
    network_key: Option<String>,
    node_id: Option<String>,
    devices: Vec<Device>,
}

#[derive(Serialize)]
struct Device {
    id: String,
    pubkey: String,
    name: String,
    role: String,
    status: String,
}

#[tauri::command]
fn get_network_info(state: State<AppState>) -> Result<NetworkInfo, String> {
    let db = state.db.lock().unwrap();
    let network_key: Option<String> = db.query_row("SELECT value FROM node_metadata WHERE key = 'network_key'", [], |row| row.get(0)).optional().map_err(|e| e.to_string())?;
    let node_id: Option<String> = db.query_row("SELECT value FROM node_metadata WHERE key = 'node_id'", [], |row| row.get(0)).optional().map_err(|e| e.to_string())?;

    let mut stmt = db.prepare("SELECT id, pubkey, name, role, status FROM devices").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(Device {
            id: row.get(0)?,
            pubkey: row.get(1)?,
            name: row.get(2)?,
            role: row.get(3)?,
            status: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut devices = Vec::new();
    for r in rows {
        if let Ok(d) = r {
            devices.push(d);
        }
    }

    Ok(NetworkInfo {
        network_key,
        node_id,
        devices,
    })
}

use rand::RngExt;
fn generate_network_key() -> String {
    let mut rng = rand::rng();
    let chars: Vec<char> = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".chars().collect();
    let mut key = String::new();
    for i in 0..9 {
        if i == 4 {
            key.push('-');
        } else {
            key.push(chars[rng.random_range(0..chars.len())]);
        }
    }
    key
}

#[tauri::command]
fn create_network(state: State<AppState>) -> Result<NetworkInfo, String> {
    let db = state.db.lock().unwrap();
    let key = generate_network_key();
    let node_id = uuid::Uuid::new_v4().to_string(); // Placeholder for actual ed25519 pubkey

    db.execute("INSERT OR REPLACE INTO node_metadata (key, value) VALUES ('network_key', ?1)", params![key]).map_err(|e| e.to_string())?;
    db.execute("INSERT OR REPLACE INTO node_metadata (key, value) VALUES ('node_id', ?1)", params![node_id]).map_err(|e| e.to_string())?;

    // Add self as authorized admin device
    db.execute(
        "INSERT OR IGNORE INTO devices (id, pubkey, name, role, status) VALUES (?1, ?1, 'This Mac', 'administrator', 'online')",
        params![node_id],
    ).map_err(|e| e.to_string())?;

    drop(db);
    get_network_info(state)
}

#[tauri::command]
fn join_network(state: State<AppState>, network_key: String) -> Result<NetworkInfo, String> {
    let db = state.db.lock().unwrap();
    let node_id = uuid::Uuid::new_v4().to_string(); // Placeholder for actual ed25519 pubkey

    db.execute("INSERT OR REPLACE INTO node_metadata (key, value) VALUES ('network_key', ?1)", params![network_key]).map_err(|e| e.to_string())?;
    db.execute("INSERT OR REPLACE INTO node_metadata (key, value) VALUES ('node_id', ?1)", params![node_id]).map_err(|e| e.to_string())?;

    // Add self as pending device
    db.execute(
        "INSERT OR IGNORE INTO devices (id, pubkey, name, role, status) VALUES (?1, ?1, 'This Device', 'standard', 'pending_authorization')",
        params![node_id],
    ).map_err(|e| e.to_string())?;

    drop(db);
    get_network_info(state)
}


#[tauri::command]
async fn start_sync_engine(state: tauri::State<'_, AppState>) -> Result<String, String> {
    // Placeholder for Phase 3: Iroh Networking & Sync Engine
    // 1. Fetch node_id and network_key from db
    // 2. Initialize iroh::Endpoint
    // 3. Start gossip protocol / sync loop
    
    // Simulating startup delay
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    Ok("Sync engine initialized and running in background".to_string())
}

// ------ SCHOOLS ------
#[tauri::command]
fn get_schools(state: State<AppState>) -> Result<Vec<School>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, school_name, province, district, local_level, principal_name, email_id, clec_established_year, clec_category FROM school").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(School {
            id: Some(row.get(0)?),
            school_name: row.get(1)?,
            province: row.get(2)?,
            district: row.get(3)?,
            local_level: row.get(4)?,
            principal_name: row.get(5)?,
            email_id: row.get(6)?,
            clec_established_year: row.get(7)?,
            clec_category: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut schools = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            schools.push(s);
        }
    }
    Ok(schools)
}

#[tauri::command]
fn create_school(state: State<AppState>, payload: School) -> Result<School, String> {
    let db = state.db.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO school (id, school_name, province, district, local_level, principal_name, email_id, clec_established_year, clec_category) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, payload.school_name, payload.province, payload.district, payload.local_level, payload.principal_name, payload.email_id, payload.clec_established_year, payload.clec_category],
    ).map_err(|e| e.to_string())?;
    
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn update_school(state: State<AppState>, id: String, payload: School) -> Result<School, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE school SET school_name=?1, province=?2, district=?3, local_level=?4, principal_name=?5, email_id=?6, clec_established_year=?7, clec_category=?8 WHERE id=?9",
        params![payload.school_name, payload.province, payload.district, payload.local_level, payload.principal_name, payload.email_id, payload.clec_established_year, payload.clec_category, id],
    ).map_err(|e| e.to_string())?;
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn delete_school(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM school WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(id)
}


// ------ STUDENTS ------
#[tauri::command]
fn get_students(state: State<AppState>) -> Result<Vec<Student>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, student_id, gender, school_name, grade, academic_year, school_district, category FROM student").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Student {
            id: Some(row.get(0)?),
            student_id: row.get(1)?,
            gender: row.get(2)?,
            school_name: row.get(3)?,
            grade: row.get(4)?,
            academic_year: row.get(5)?,
            school_district: row.get(6)?,
            category: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut students = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            students.push(s);
        }
    }
    Ok(students)
}

#[tauri::command]
fn create_student(state: State<AppState>, payload: Student) -> Result<Student, String> {
    let db = state.db.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO student (id, student_id, gender, school_name, grade, academic_year, school_district, category) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, payload.student_id, payload.gender, payload.school_name, payload.grade, payload.academic_year, payload.school_district, payload.category],
    ).map_err(|e| e.to_string())?;
    
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn update_student(state: State<AppState>, id: String, payload: Student) -> Result<Student, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE student SET student_id=?1, gender=?2, school_name=?3, grade=?4, academic_year=?5, school_district=?6, category=?7 WHERE id=?8",
        params![payload.student_id, payload.gender, payload.school_name, payload.grade, payload.academic_year, payload.school_district, payload.category, id],
    ).map_err(|e| e.to_string())?;
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn delete_student(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM student WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(id)
}

// ------ TEACHERS ------
#[tauri::command]
fn get_teachers(state: State<AppState>) -> Result<Vec<Teacher>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, teacher_id, gender, school_name, school_district, status, email, contact FROM teacher").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Teacher {
            id: Some(row.get(0)?),
            teacher_id: row.get(1)?,
            gender: row.get(2)?,
            school_name: row.get(3)?,
            school_district: row.get(4)?,
            status: row.get(5)?,
            email: row.get(6)?,
            contact: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut teachers = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            teachers.push(s);
        }
    }
    Ok(teachers)
}

#[tauri::command]
fn create_teacher(state: State<AppState>, payload: Teacher) -> Result<Teacher, String> {
    let db = state.db.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO teacher (id, teacher_id, gender, school_name, school_district, status, email, contact) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, payload.teacher_id, payload.gender, payload.school_name, payload.school_district, payload.status, payload.email, payload.contact],
    ).map_err(|e| e.to_string())?;
    
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn update_teacher(state: State<AppState>, id: String, payload: Teacher) -> Result<Teacher, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE teacher SET teacher_id=?1, gender=?2, school_name=?3, school_district=?4, status=?5, email=?6, contact=?7 WHERE id=?8",
        params![payload.teacher_id, payload.gender, payload.school_name, payload.school_district, payload.status, payload.email, payload.contact, id],
    ).map_err(|e| e.to_string())?;
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn delete_teacher(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM teacher WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(id)
}

// ------ TRAININGS ------
#[tauri::command]
fn get_trainings(state: State<AppState>) -> Result<Vec<Training>, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT id, training_title, credit_course, start_date, end_date, participant_name, school_name, email_id FROM training").map_err(|e| e.to_string())?;
    
    let rows = stmt.query_map([], |row| {
        Ok(Training {
            id: Some(row.get(0)?),
            training_title: row.get(1)?,
            credit_course: row.get(2)?,
            start_date: row.get(3)?,
            end_date: row.get(4)?,
            participant_name: row.get(5)?,
            school_name: row.get(6)?,
            email_id: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut trainings = Vec::new();
    for r in rows {
        if let Ok(s) = r {
            trainings.push(s);
        }
    }
    Ok(trainings)
}

#[tauri::command]
fn create_training(state: State<AppState>, payload: Training) -> Result<Training, String> {
    let db = state.db.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();
    db.execute(
        "INSERT INTO training (id, training_title, credit_course, start_date, end_date, participant_name, school_name, email_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![id, payload.training_title, payload.credit_course, payload.start_date, payload.end_date, payload.participant_name, payload.school_name, payload.email_id],
    ).map_err(|e| e.to_string())?;
    
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn update_training(state: State<AppState>, id: String, payload: Training) -> Result<Training, String> {
    let db = state.db.lock().unwrap();
    db.execute(
        "UPDATE training SET training_title=?1, credit_course=?2, start_date=?3, end_date=?4, participant_name=?5, school_name=?6, email_id=?7 WHERE id=?8",
        params![payload.training_title, payload.credit_course, payload.start_date, payload.end_date, payload.participant_name, payload.school_name, payload.email_id, id],
    ).map_err(|e| e.to_string())?;
    let mut result = payload.clone();
    result.id = Some(id);
    Ok(result)
}

#[tauri::command]
fn delete_training(state: State<AppState>, id: String) -> Result<String, String> {
    let db = state.db.lock().unwrap();
    db.execute("DELETE FROM training WHERE id=?1", params![id]).map_err(|e| e.to_string())?;
    Ok(id)
}

// ------ AUTHENTICATION ------
#[derive(Serialize)]
struct LoginResponse {
    success: bool,
    role: Option<String>,
    require_password_change: Option<bool>,
    error: Option<String>,
}

#[tauri::command]
fn login(state: State<AppState>, username: String, password: String) -> Result<LoginResponse, String> {
    let db = state.db.lock().unwrap();
    let mut stmt = db.prepare("SELECT password_hash, role, require_password_change FROM users WHERE username = ?1").map_err(|e| e.to_string())?;
    
    let user_row = stmt.query_row(params![username], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?, row.get::<_, bool>(2)?))
    });

    match user_row {
        Ok((hash, role, require_password_change)) => {
            if verify_password(&hash, &password) {
                Ok(LoginResponse {
                    success: true,
                    role: Some(role),
                    require_password_change: Some(require_password_change),
                    error: None,
                })
            } else {
                Ok(LoginResponse { success: false, role: None, require_password_change: None, error: Some("Invalid password".to_string()) })
            }
        },
        Err(_) => Ok(LoginResponse { success: false, role: None, require_password_change: None, error: Some("User not found".to_string()) })
    }
}

#[tauri::command]
fn change_password(state: State<AppState>, username: String, old_password: String, new_password: String) -> Result<bool, String> {
    let db = state.db.lock().unwrap();
    let hash: String = db.query_row("SELECT password_hash FROM users WHERE username = ?1", params![username], |row| row.get(0)).map_err(|e| e.to_string())?;
    
    if verify_password(&hash, &old_password) {
        let new_hash = hash_password(&new_password);
        db.execute(
            "UPDATE users SET password_hash = ?1, require_password_change = 0 WHERE username = ?2",
            params![new_hash, username],
        ).map_err(|e| e.to_string())?;
        Ok(true)
    } else {
        Err("Invalid old password".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db_path = {
                let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
                std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
                let target_db = app_dir.join("edubase.db");

                if !target_db.exists() {
                    if let Ok(resource_dir) = app.path().resource_dir() {
                        let bundled_db = resource_dir.join("edubase.db");
                        if bundled_db.exists() {
                            let _ = std::fs::copy(bundled_db, &target_db);
                        }
                    }
                }
                target_db
            };

            let db = init_db(db_path).expect("Failed to initialize database");
            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_schools, create_school, update_school, delete_school,
            get_students, create_student, update_student, delete_student,
            get_teachers, create_teacher, update_teacher, delete_teacher,
            get_trainings, create_training, update_training, delete_training,
            login, change_password,
            get_network_info, create_network, join_network, start_sync_engine
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
