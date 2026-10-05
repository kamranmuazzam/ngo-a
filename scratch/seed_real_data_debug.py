import pandas as pd
import requests
import os

BASE_URL = "http://localhost:3000/api"
folder = "/Users/kamran/Downloads/ngo/t1/sample data"

def safe_str(val):
    if pd.isna(val): return ""
    s = str(val).strip()
    if s.endswith(".0"): s = s[:-2]
    return s

print("Parsing Students...")
path_students = os.path.join(folder, "CLEC's Student & teacher Benificaires List_ Updated Aug 2026.xlsx")
df_students = pd.read_excel(path_students, sheet_name="CLEC Student List_020_026")
print(f"Loaded {len(df_students)} rows")
for i, row in df_students.iterrows():
    student_id = row.get('Student ID')
    
    # Many real-world sheets have whitespace in headers or missing IDs
    if pd.isna(student_id): 
        # try lowercase or strip
        pass
        
    payload = {
        "student_id": safe_str(student_id),
        "gender": safe_str(row.get('Gender')),
        "school_name": safe_str(row.get('School Name')),
        "grade": safe_str(row.get('Grade')),
        "academic_year": safe_str(row.get('A. Year')),
        "school_district": safe_str(row.get('School District')),
        "category": safe_str(row.get('Student Category'))
    }
    if not payload["student_id"]: continue
    
    res = requests.post(f"{BASE_URL}/students", json=payload)
    if not res.ok:
        print(f"Error Student POST: {res.text}")

print("Parsing Teachers...")
df_teachers = pd.read_excel(path_students, sheet_name="CLEC Teacher List_020-026")
print(f"Loaded {len(df_teachers)} rows")
for i, row in df_teachers.iterrows():
    teacher_id = row.get('Teacheer ID')
    if pd.isna(teacher_id) and 'Teacher ID' in row:
        teacher_id = row.get('Teacher ID')
        
    payload = {
        "teacher_id": safe_str(teacher_id),
        "gender": safe_str(row.get('Gender')),
        "school_name": safe_str(row.get('School Name')),
        "school_district": safe_str(row.get('School Distrcit')),
        "status": safe_str(row.get('Status')),
        "email": safe_str(row.get('Email')),
        "contact": safe_str(row.get('Contact'))
    }
    if not payload["teacher_id"]: continue
    
    res = requests.post(f"{BASE_URL}/teachers", json=payload)
    if not res.ok:
        print(f"Error Teacher POST: {res.text}")

print("Done")
