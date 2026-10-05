import os
import asyncio
import subprocess
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
import uvicorn
import pandas as pd
import io
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EduBase AI Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    query: str

async def get_ai_response(system_instruction: str, query: str, model: str = None) -> str:
    prompt = f"System Instructions: {system_instruction}\n\nUser Query: {query}"
    
    cmd = ["agy"]
    if model:
        cmd.extend(["--model", model])
        
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate(input=prompt.encode('utf-8'))
        
        if process.returncode == 0:
            return stdout.decode('utf-8').strip()
        else:
            return f"Error communicating with AI: {stderr.decode('utf-8').strip()}"
            
    except Exception as e:
        return f"Failed to execute 'agy': {str(e)}"

@app.post("/api/extract-excel")
async def extract_excel(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    data_snippet = df.head(10).to_json()
    
    ai_resp = await get_ai_response(
        "You are a data mapping AI. Map the provided excel data into student and teacher database schemas.",
        f"Analyze the following data and extract the schema, then return JSON objects for database insertion: {data_snippet}",
        model="gemini-3.1-pro-high"
    )
    return {"status": "success", "message": "Extracted records", "columns": list(df.columns), "ai_analysis": ai_resp}

import uuid

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend", "reports_out")
os.makedirs(REPORTS_DIR, exist_ok=True)

import requests

import json
from typing import List

class QAPair(BaseModel):
    question: str
    answer: str

class GenerateReportRequest(BaseModel):
    query: str
    report_type: str = "custom"
    training_filter: str = "all"
    additional_context: str = ""
    qa_history: List[QAPair] = []

TEMPLATES_FILE = os.path.join(REPORTS_DIR, "templates.json")

class WizardNextRequest(BaseModel):
    topic: str
    report_type: str
    training_filter: str
    history: List[QAPair]

@app.post("/api/wizard/next")
async def wizard_next(req: WizardNextRequest):
    context_str = json.dumps([{"q": h.question, "a": h.answer} for h in req.history])
    prompt = f"""You are an AI assistant orchestrating a report generation wizard. 
The user wants to generate a '{req.report_type}' about '{req.topic}'.
Here is the Q&A history so far: {context_str}

Analyze the history. If you need more qualitative details (e.g., specific challenges, stakeholder quotes, recommendations), generate 1 to 2 follow-up questions.
If you have enough information to write a comprehensive report, set status to 'done'.
Respond STRICTLY in JSON format like this:
{{"status": "asking", "questions": ["Question 1?", "Question 2?"]}}
or
{{"status": "done", "questions": []}}
"""
    ai_resp = await get_ai_response(
        "You are a strict JSON-only API.",
        prompt,
        model="gemini-3.8-flash-low"
    )
    
    try:
        start_idx = ai_resp.find('{')
        end_idx = ai_resp.rfind('}') + 1
        return json.loads(ai_resp[start_idx:end_idx])
    except Exception:
        return {"status": "done", "questions": []}

class TemplateSaveRequest(BaseModel):
    name: str
    questions: List[str]

@app.post("/api/wizard/templates")
async def save_template(req: TemplateSaveRequest):
    templates = []
    if os.path.exists(TEMPLATES_FILE):
        with open(TEMPLATES_FILE, "r") as f:
            templates = json.load(f)
    templates.append({"name": req.name, "questions": req.questions})
    with open(TEMPLATES_FILE, "w") as f:
        json.dump(templates, f)
    return {"status": "success"}

@app.get("/api/wizard/templates")
async def get_templates():
    if os.path.exists(TEMPLATES_FILE):
        with open(TEMPLATES_FILE, "r") as f:
            return json.load(f)
    return []

@app.post("/api/generate-report")
async def generate_report(req: GenerateReportRequest):
    query = req.query
    report_type = req.report_type
    training_filter = req.training_filter
    additional_context = req.additional_context
    
    def fetch_data():
        try:
            return {
                "students": requests.get("http://localhost:3000/api/students").json(),
                "teachers": requests.get("http://localhost:3000/api/teachers").json(),
                "schools": requests.get("http://localhost:3000/api/schools").json(),
                "trainings": requests.get("http://localhost:3000/api/trainings").json()
            }
        except Exception:
            return {}
            
    db_data = await asyncio.to_thread(fetch_data)
    
    if training_filter != "all":
        db_data["trainings"] = [t for t in db_data.get("trainings", []) if t.get("training_title") == training_filter]
        
    context = f"Database Context:\nStudents (Sample): {str(db_data.get('students', []))[:100000]}\nTeachers: {str(db_data.get('teachers', []))[:30000]}\nSchools: {str(db_data.get('schools', []))[:30000]}\nTrainings: {str(db_data.get('trainings', []))[:30000]}"
    
    if training_filter != "all":
        context += f"\n\nIMPORTANT: The user specifically requested this report to focus ONLY on the training event '{training_filter}'. Ensure the report focuses entirely on this event."
        
    if additional_context:
        context += f"\n\nAdditional User-Provided Details / Qualitative Feedback:\n{additional_context}\n\nIMPORTANT: Incorporate these additional details directly into the report."
        
    if req.qa_history:
        history_text = "\n".join([f"Q: {item.question}\nA: {item.answer}" for item in req.qa_history])
        context += f"\n\nAdditional User-Provided Qualitative Data:\n{history_text}\n\nIMPORTANT: Incorporate these details extensively into the report."
    
    import uuid
    file_id = str(uuid.uuid4())
    pdf_filename = f"{file_id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)
    map_filename = f"{file_id}_map.png"
    map_path = os.path.join(REPORTS_DIR, map_filename)

    if report_type == "impact":
        from map_generator import generate_impact_map
        map_success = await generate_impact_map(db_data.get("schools", []), map_path)
        map_instruction = f'Include a Geographical Overview section and insert the dynamically generated map image using `#image("{map_filename}", width: 85%)`. ' if map_success else ""
        
        system_instruction = (
            "You are a professional report writer. Generate a formal Impact Assessment Report in Typst. "
            "Title the document 'CLEC PROJECT IMPACT REPORT'. "
            "Include sections: Introduction, Objectives, Methodology, Geographical Overview, Key Findings, Quantitative Analysis, Qualitative Feedback, and Conclusion. "
            + map_instruction +
            "Use a formal, academic tone. Anchor all demographics and statistics strictly to the provided database context. "
            "Use `#table`, `#figure`, and `#rect` in Typst to present data. Do NOT output markdown; output ONLY valid Typst markup code."
        )
    elif report_type == "newsletter":
        system_instruction = (
            "You are a creative NGO copywriter. Generate an engaging DB4N Newsletter in Typst. "
            "Title it 'DB4N Quarterly Newsletter'. "
            "Use a 2-column layout (`#set page(columns: 2)`). Use a friendly, inspiring tone. "
            "Include sections: 'Message from the Director', 'School Spotlights', 'Teacher of the Month', and 'Recent Training Events'. "
            "Base names, districts, and statistics strictly on the provided database context. "
            "Do NOT output markdown; output ONLY valid Typst markup code."
        )
    else:
        system_instruction = (
            "You are a professional report writer and data analyst. Analyze the database context to accurately answer the user query. "
            "Output valid, compilable Typst markup code ONLY. Start with `#set page(...)`. "
            "Do NOT include markdown codeblocks or explanatory text. Base all statistics and answers strictly on this raw data."
        )
        
    ai_resp = await get_ai_response(
        f"{system_instruction}\n\n{context}",
        query,
        model="gemini-3.1-pro-high"
    )
    
    import tempfile
    
    # Strip markdown backticks if AI included them
    clean_resp = ai_resp.strip()
    if clean_resp.startswith("```typst"):
        clean_resp = clean_resp[8:]
    elif clean_resp.startswith("```"):
        clean_resp = clean_resp[3:]
    if clean_resp.endswith("```"):
        clean_resp = clean_resp[:-3]
    clean_resp = clean_resp.strip()
    
    typ_path = os.path.join(REPORTS_DIR, f"{file_id}.typ")
    with open(typ_path, "w", encoding="utf-8") as f:
        f.write(clean_resp)
        
    import subprocess
    proc = subprocess.run(["typst", "compile", typ_path, pdf_path], capture_output=True)
    if proc.returncode != 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=proc.stderr.decode('utf-8'))
        
    return {"status": "success", "report_text": f"/reports_out/{pdf_filename}"}

@app.post("/api/chat")
async def chat(request: ChatRequest):
    def fetch_data():
        try:
            return {
                "students": requests.get("http://localhost:3000/api/students").json(),
                "teachers": requests.get("http://localhost:3000/api/teachers").json(),
                "schools": requests.get("http://localhost:3000/api/schools").json()
            }
        except Exception:
            return {}
            
    db_data = await asyncio.to_thread(fetch_data)
    context = f"Database Context:\nStudents (Sample): {str(db_data.get('students', []))[:150000]}\nTeachers: {str(db_data.get('teachers', []))[:50000]}\nSchools: {str(db_data.get('schools', []))[:50000]}"

    ai_resp = await get_ai_response(
        f"You are a helpful education AI assistant for EduBase. Provide helpful insights about students, teachers, and school data. Keep it concise. Base all answers strictly on the following raw database records:\n\n{context}",
        request.query,
        model="gemini-3.8-flash-low"
    )
    return {"response": ai_resp}

if __name__ == "__main__":
    uvicorn.run("agent:app", host="0.0.0.0", port=8001, reload=True)
