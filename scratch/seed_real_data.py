import pandas as pd
import requests
import os
import time

BASE_URL = "http://localhost:3000/api"
folder = "/Users/kamran/Downloads/ngo/t1/sample data"

def safe_str(val):
    if pd.isna(val): return ""
    # if it's float ending in .0, trim it
    s = str(val)
    if s.endswith(".0"): s = s[:-2]
    return s

def seed():
    # 1. Parse Schools
    print("Parsing Schools...")
    df_schools = pd.read_excel(os.path.join(folder, "CLEC School & Community Information Sheet.xlsx"), sheet_name="CLEC School Information Sheet")
    for _, row in df_schools.iterrows():
        if pd.isna(row.get('School Name')): continue
        payload = {
            "school_name": safe_str(row.get('School Name')),
            "province": safe_str(row.get('Province')),
            "district": safe_str(row.get('District')),
            "local_level": safe_str(row.get('Local Level')),
            "principal_name": safe_str(row.get('Principal Name')),
            "email_id": safe_str(row.get('Email ID')),
            "clec_established_year": safe_str(row.get('CLEC Established Year')),
            "clec_category": safe_str(row.get('CLEC Category'))
        }
        requests.post(f"{BASE_URL}/schools", json=payload)

    # 2. Parse Students
    print("Parsing Students...")
    df_students = pd.read_excel(os.path.join(folder, "CLEC's Student & teacher Benificaires List_ Updated Aug 2026.xlsx"), sheet_name="CLEC Student List_020_026")
    for _, row in df_students.iterrows():
        if pd.isna(row.get('Student ID')): continue
        payload = {
            "student_id": safe_str(row.get('Student ID')),
            "gender": safe_str(row.get('Gender')),
            "school_name": safe_str(row.get('School Name')),
            "grade": safe_str(row.get('Grade')),
            "academic_year": safe_str(row.get('A. Year')),
            "school_district": safe_str(row.get('School District')),
            "category": safe_str(row.get('Student Category'))
        }
        requests.post(f"{BASE_URL}/students", json=payload)

    # 3. Parse Teachers
    print("Parsing Teachers...")
    df_teachers = pd.read_excel(os.path.join(folder, "CLEC's Student & teacher Benificaires List_ Updated Aug 2026.xlsx"), sheet_name="CLEC Teacher List_020-026")
    for _, row in df_teachers.iterrows():
        if pd.isna(row.get('Teacheer ID')): continue
        payload = {
            "teacher_id": safe_str(row.get('Teacheer ID')),
            "gender": safe_str(row.get('Gender')),
            "school_name": safe_str(row.get('School Name')),
            "school_district": safe_str(row.get('School Distrcit')),
            "status": safe_str(row.get('Status')),
            "email": safe_str(row.get('Email')),
            "contact": safe_str(row.get('Contact'))
        }
        requests.post(f"{BASE_URL}/teachers", json=payload)

    # 4. Parse Trainings
    print("Parsing Trainings...")
    df_trainings = pd.read_excel(os.path.join(folder, "CLEC Training Participant Detail.xlsx"), sheet_name="Sheet1")
    for _, row in df_trainings.iterrows():
        if pd.isna(row.get('Training Title')): continue
        payload = {
            "training_title": safe_str(row.get('Training Title')),
            "credit_course": safe_str(row.get('Total Credit Course')),
            "start_date": safe_str(row.get('Start Date')),
            "end_date": safe_str(row.get('End Date')),
            "participant_name": safe_str(row.get('Name of Participant')),
            "school_name": safe_str(row.get('School Name')),
            "email_id": safe_str(row.get('Email ID'))
        }
        requests.post(f"{BASE_URL}/trainings", json=payload)

    print("Data population complete!")

if __name__ == "__main__":
    # Wait for backend to be ready
    time.sleep(2)
    seed()
