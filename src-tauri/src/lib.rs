use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use tauri::Manager;

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

    Ok(conn)
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(any(target_os = "android", target_os = "ios"))]
            let db_path = {
                let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
                std::fs::create_dir_all(&app_dir).expect("Failed to create app data dir");
                app_dir.join("edubase.db")
            };

            #[cfg(not(any(target_os = "android", target_os = "ios")))]
            let db_path = std::path::PathBuf::from("edubase.db");

            let db = init_db(db_path).expect("Failed to initialize database");
            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_schools, create_school, update_school, delete_school,
            get_students, create_student, update_student, delete_student,
            get_teachers, create_teacher, update_teacher, delete_teacher,
            get_trainings, create_training, update_training, delete_training
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
