use axum::{
    extract::{Path, State},
    http::Method,
    routing::{get, post, put, delete},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use surrealdb::engine::remote::ws::Ws;
use surrealdb::engine::remote::ws::Client;
use surrealdb::Surreal;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use surrealdb::sql::Thing;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct School {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Thing>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Thing>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Thing>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Thing>,
    training_title: String,
    credit_course: String,
    start_date: String,
    end_date: String,
    participant_name: String,
    school_name: String,
    email_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Report {
    #[serde(skip_serializing_if = "Option::is_none")]
    id: Option<Thing>,
    topic: String,
    content: String,
    runtime_seconds: i32,
    created_at: String,
}

struct AppState {
    db: Surreal<Client>,
}

#[tokio::main]
async fn main() -> surrealdb::Result<()> {
    println!("Connecting to DB...");
    let db_url = std::env::var("DB_URL").unwrap_or_else(|_| "127.0.0.1:8000".to_string());
    let db = Surreal::new::<Ws>(db_url).await?;
    println!("Signing in...");
    db.signin(surrealdb::opt::auth::Root {
        username: "root",
        password: "root",
    }).await?;
    println!("Using namespace...");
    db.use_ns("edubase").use_db("edubase").await?;
    println!("DB connected!");

    let shared_state = Arc::new(AppState { db });

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_origin(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/students", get(get_students).post(create_student))
        .route("/api/students/{id}", put(update_student).delete(delete_student))
        .route("/api/teachers", get(get_teachers).post(create_teacher))
        .route("/api/teachers/{id}", put(update_teacher).delete(delete_teacher))
        .route("/api/schools", get(get_schools).post(create_school))
        .route("/api/schools/{id}", put(update_school).delete(delete_school))
        .route("/api/trainings", get(get_trainings).post(create_training))
        .route("/api/trainings/{id}", put(update_training).delete(delete_training))
        .route("/api/reports", get(get_reports).post(create_report))
        .route("/api/reports/{id}", delete(delete_report))
        .nest_service("/reports_out", ServeDir::new("/Users/kamran/Downloads/ngo/t1/backend/reports_out"))
        .layer(cors)
        .with_state(shared_state);

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3000));
    println!("Backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();

    Ok(())
}

// Handlers for Students
async fn get_students(State(state): State<Arc<AppState>>) -> Json<Vec<Student>> {
    let mut response = state.db.query("SELECT * FROM student").await.unwrap();
    let data: Vec<Student> = response.take(0).unwrap_or_default();
    Json(data)
}

async fn create_student(State(state): State<Arc<AppState>>, Json(payload): Json<Student>) -> Json<Option<Student>> {
    let mut created: Vec<Student> = state.db.create("student").content(payload).await.unwrap_or(vec![]);
    Json(created.pop())
}

async fn update_student(State(state): State<Arc<AppState>>, Path(id): Path<String>, Json(payload): Json<Student>) -> Json<Option<Student>> {
    let updated: Option<Student> = state.db.update(("student", id)).content(payload).await.unwrap_or(None);
    Json(updated)
}

async fn delete_student(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Json<Option<Student>> {
    let deleted: Option<Student> = state.db.delete(("student", id)).await.unwrap_or(None);
    Json(deleted)
}

// Handlers for Teachers
async fn get_teachers(State(state): State<Arc<AppState>>) -> Json<Vec<Teacher>> {
    let mut response = state.db.query("SELECT * FROM teacher").await.unwrap();
    let data: Vec<Teacher> = response.take(0).unwrap_or_default();
    Json(data)
}

async fn create_teacher(State(state): State<Arc<AppState>>, Json(payload): Json<Teacher>) -> Json<Option<Teacher>> {
    let mut created: Vec<Teacher> = state.db.create("teacher").content(payload).await.unwrap_or(vec![]);
    Json(created.pop())
}

async fn update_teacher(State(state): State<Arc<AppState>>, Path(id): Path<String>, Json(payload): Json<Teacher>) -> Json<Option<Teacher>> {
    let updated: Option<Teacher> = state.db.update(("teacher", id)).content(payload).await.unwrap_or(None);
    Json(updated)
}

async fn delete_teacher(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Json<Option<Teacher>> {
    let deleted: Option<Teacher> = state.db.delete(("teacher", id)).await.unwrap_or(None);
    Json(deleted)
}

// Handlers for Schools
async fn get_schools(State(state): State<Arc<AppState>>) -> Json<Vec<School>> {
    let mut response = state.db.query("SELECT * FROM school").await.unwrap();
    let data: Vec<School> = response.take(0).unwrap_or_default();
    Json(data)
}

async fn create_school(State(state): State<Arc<AppState>>, Json(payload): Json<School>) -> Json<Option<School>> {
    let mut created: Vec<School> = state.db.create("school").content(payload).await.unwrap_or(vec![]);
    Json(created.pop())
}

async fn update_school(State(state): State<Arc<AppState>>, Path(id): Path<String>, Json(payload): Json<School>) -> Json<Option<School>> {
    let updated: Option<School> = state.db.update(("school", id)).content(payload).await.unwrap_or(None);
    Json(updated)
}

async fn delete_school(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Json<Option<School>> {
    let deleted: Option<School> = state.db.delete(("school", id)).await.unwrap_or(None);
    Json(deleted)
}

// Handlers for Trainings
async fn get_trainings(State(state): State<Arc<AppState>>) -> Json<Vec<Training>> {
    let mut response = state.db.query("SELECT * FROM training").await.unwrap();
    let data: Vec<Training> = response.take(0).unwrap_or_default();
    Json(data)
}

async fn create_training(State(state): State<Arc<AppState>>, Json(payload): Json<Training>) -> Json<Option<Training>> {
    let mut created: Vec<Training> = state.db.create("training").content(payload).await.unwrap_or(vec![]);
    Json(created.pop())
}

async fn update_training(State(state): State<Arc<AppState>>, Path(id): Path<String>, Json(payload): Json<Training>) -> Json<Option<Training>> {
    let updated: Option<Training> = state.db.update(("training", id)).content(payload).await.unwrap_or(None);
    Json(updated)
}

async fn delete_training(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Json<Option<Training>> {
    let deleted: Option<Training> = state.db.delete(("training", id)).await.unwrap_or(None);
    Json(deleted)
}

// Handlers for Reports
async fn get_reports(State(state): State<Arc<AppState>>) -> Json<Vec<Report>> {
    let mut response = state.db.query("SELECT * FROM report").await.unwrap();
    let data: Vec<Report> = response.take(0).unwrap_or_default();
    Json(data)
}

async fn create_report(State(state): State<Arc<AppState>>, Json(payload): Json<Report>) -> Json<Option<Report>> {
    let mut created: Vec<Report> = state.db.create("report").content(payload).await.unwrap_or(vec![]);
    Json(created.pop())
}

async fn delete_report(State(state): State<Arc<AppState>>, Path(id): Path<String>) -> Json<Option<Report>> {
    let deleted: Option<Report> = state.db.delete(("report", id)).await.unwrap_or(None);
    Json(deleted)
}
