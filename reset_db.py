import requests
import random
import time

BASE_URL = "http://localhost:3000/api"

print("Wiping existing data...")
endpoints = ["students", "teachers", "schools", "trainings", "reports"]
for endpoint in endpoints:
    items = requests.get(f"{BASE_URL}/{endpoint}").json()
    for item in items:
        # The ID returned might be an object {'tb': 'student', 'id': {'String': '...'}} in v1, or a string
        item_id = item.get("id")
        if isinstance(item_id, dict):
            # parse out the actual ID part
            id_val = item_id.get('id', {}).get('String', '')
            if not id_val:
                id_val = item_id.get('id', '')
            tb_val = item_id.get('tb', '')
            if id_val and tb_val:
                requests.delete(f"{BASE_URL}/{endpoint}/{id_val}")
        elif isinstance(item_id, str):
            clean_id = item_id.split(':')[-1]
            requests.delete(f"{BASE_URL}/{endpoint}/{clean_id}")

print("Data wiped! Now seeding...")
schools = ["Sotang CLEC", "Gorkha CLEC", "Triyuga CLEC", "Kathmandu CLEC", "Lalitpur CLEC", "Bhaktapur CLEC", "Pokhara CLEC", "Dharan CLEC", "Biratnagar CLEC"]

for s in schools:
    payload = {
        "school_name": s,
        "province": random.choice(["Province 1", "Bagmati", "Gandaki"]),
        "district": random.choice(["Solukhumbu", "Gorkha", "Kathmandu"]),
        "local_level": "Municipality",
        "principal_name": "Principal " + str(random.randint(1, 100)),
        "email_id": f"{s.lower().replace(' ', '')}@example.com",
        "clec_established_year": "2020",
        "clec_category": "Public"
    }
    requests.post(f"{BASE_URL}/schools", json=payload)

for i in range(50):
    payload = {
        "teacher_id": f"TCH-{i:04d}",
        "gender": random.choice(["Male", "Female"]),
        "school_name": random.choice(schools),
        "school_district": random.choice(["Solukhumbu", "Gorkha", "Kathmandu"]),
        "status": "Active",
        "email": f"teacher{i}@example.com",
        "contact": f"9841{random.randint(100000, 999999)}"
    }
    requests.post(f"{BASE_URL}/teachers", json=payload)

categories = ["Active", "Alumni", "Regular"]
for i in range(300):
    payload = {
        "student_id": f"STU-{i:05d}",
        "gender": random.choice(["Male", "Female"]),
        "school_name": random.choice(schools),
        "grade": f"Grade {random.randint(1,12)}",
        "academic_year": "2026",
        "school_district": random.choice(["Solukhumbu", "Gorkha", "Kathmandu"]),
        "category": random.choices(categories, weights=[60, 20, 20])[0]
    }
    requests.post(f"{BASE_URL}/students", json=payload)

for i in range(40):
    payload = {
        "training_title": random.choice(["Digital Literacy", "STEM Education", "Leadership", "Coding Basics"]),
        "credit_course": "Yes",
        "start_date": f"2026-01-{random.randint(10, 28)}",
        "end_date": f"2026-01-{random.randint(10, 28)}",
        "participant_name": f"Teacher {i}",
        "school_name": random.choice(schools),
        "email_id": f"participant{i}@example.com"
    }
    requests.post(f"{BASE_URL}/trainings", json=payload)

print("Database cleanly seeded with Schools, Teachers, Students (Active & Alumni), and Training Events!")
