import pandas as pd
import requests
import warnings
warnings.filterwarnings("ignore")

BASE_URL = "http://localhost:3000/api"

def clean(val):
    if pd.isna(val):
        return ""
    if isinstance(val, float) and val.is_integer():
        return str(int(val))
    return str(val)

print("Wiping existing dummy data...")
for endpoint in ["students", "teachers", "schools", "trainings", "reports"]:
    items = requests.get(f"{BASE_URL}/{endpoint}").json()
    for item in items:
        item_id = item.get("id")
        if isinstance(item_id, dict):
            id_val = item_id.get('id', {}).get('String', '')
            if not id_val:
                id_val = item_id.get('id', '')
            if id_val:
                requests.delete(f"{BASE_URL}/{endpoint}/{id_val}")
        elif isinstance(item_id, str):
            clean_id = item_id.split(':')[-1]
            requests.delete(f"{BASE_URL}/{endpoint}/{clean_id}")

print("Seeding Schools from Excel...")
df_schools = pd.read_excel("sample data/CLEC School & Community Information Sheet.xlsx")
df_schools = df_schools.fillna("")
for _, row in df_schools.iterrows():
    if not row['Installed Community']:
        continue
    payload = {
        "school_name": clean(row['Installed Community']),
        "province": clean(row['Province']),
        "district": clean(row['District']),
        "local_level": clean(row['Local Level']),
        "principal_name": clean(row['Responsible Person Name']),
        "email_id": clean(row['Email ID']),
        "clec_established_year": clean(row['CLEC Established Year']),
        "clec_category": "Public" # not in sheet, defaulting
    }
    requests.post(f"{BASE_URL}/schools", json=payload)

print("Seeding Teachers from Excel...")
df_teachers = pd.read_excel("sample data/CLEC's Student & teacher Benificaires List_ Updated Aug 2026.xlsx", sheet_name="CLEC Teacher List_020-026")
df_teachers = df_teachers.fillna("")
for _, row in df_teachers.iterrows():
    if not row['Teacheer ID']:
        continue
    payload = {
        "teacher_id": clean(row['Teacheer ID']),
        "gender": clean(row['Gender']),
        "school_name": clean(row['School Name']),
        "school_district": clean(row['School Distrcit']),
        "status": clean(row['Status']),
        "email": clean(row['Email']),
        "contact": clean(row['Contact'])
    }
    requests.post(f"{BASE_URL}/teachers", json=payload)

print("Seeding Students from Excel...")
df_students = pd.read_excel("sample data/CLEC's Student & teacher Benificaires List_ Updated Aug 2026.xlsx", sheet_name="CLEC Student List_020_026")
df_students = df_students.fillna("")
for _, row in df_students.iterrows():
    if not row['Student ID']:
        continue
    payload = {
        "student_id": clean(row['Student ID']),
        "gender": clean(row['Gender']),
        "school_name": clean(row['School Name']),
        "grade": clean(row['Grade']),
        "academic_year": clean(row['A. Year']),
        "school_district": clean(row['School District']),
        "category": clean(row['Student Category'])
    }
    requests.post(f"{BASE_URL}/students", json=payload)

print("Seeding Trainings from Excel...")
df_trainings = pd.read_excel("sample data/CLEC Training Participant Detail.xlsx")
df_trainings = df_trainings.fillna("")
for _, row in df_trainings.iterrows():
    if not row['Training Title']:
        continue
    payload = {
        "training_title": clean(row['Training Title']),
        "credit_course": clean(row['Total Credit Course']),
        "start_date": clean(row['Start Date']),
        "end_date": clean(row['End Date']),
        "participant_name": clean(row['Name of Participant']),
        "school_name": clean(row['School Name']),
        "email_id": clean(row['Email ID'])
    }
    requests.post(f"{BASE_URL}/trainings", json=payload)

print("Real data seeding complete!")
