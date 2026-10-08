import sqlite3
import uuid
import random

def seed():
    conn = sqlite3.connect('edubase.db')
    c = conn.cursor()

    # Clear existing data
    c.execute('DELETE FROM school')
    c.execute('DELETE FROM student')
    c.execute('DELETE FROM teacher')
    c.execute('DELETE FROM training')

    # Data from Digital Bridges Website
    # Format: (School Name, Province, District, Local Level, Num Students, Num Teachers)
    schools_data = [
        ("Shree Nawajagriti Chandi", "Gandaki", "Gorkha", "Bhimsenthapa", 363, 4),
        ("Shree Jageshwor", "Gandaki", "Gorkha", "Gorkha", 219, 4),
        ("Shree Prabhat", "Gandaki", "Gorkha", "Gorkha", 105, 4),
        ("Shree Sanskrit", "Gandaki", "Gorkha", "Gorkha", 129, 4),
        ("Shree Adarsha", "Gandaki", "Syangja", "Syangja", 101, 4),
        ("Shree Kuhudanda", "Koshi", "Khotang", "Khotang", 90, 2),
        ("Shree Prithvi", "Koshi", "Khotang", "Khotang", 184, 5),
        ("Shree Triyuga", "Koshi", "Udayapur", "Udayapur", 1252, 4),
        ("Shree Saraswoti", "Gandaki", "Gorkha", "Gorkha", 114, 5),
        ("Shree Shanti", "Gandaki", "Gorkha", "Gorkha", 61, 4),
        ("Shree Bindrawati", "Gandaki", "Gorkha", "Gorkha", 115, 5),
        ("Shree Sarvajanik", "Koshi", "Biratnagar", "Biratnagar", 63, 8),
        ("Shree Siddhakali", "Gandaki", "Gorkha", "Gorkha", 51, 6),
        ("Shree Janahit", "Gandaki", "Mustang", "Mustang", 48, 8),
        ("Shree Prakash Jyoti", "Gandaki", "Manang", "Manang", 58, 6),
    ]

    student_id_counter = 1
    teacher_id_counter = 1

    for s in schools_data:
        school_id = str(uuid.uuid4())
        c.execute("INSERT INTO school (id, school_name, province, district, local_level, principal_name, email_id, clec_established_year, clec_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                  (school_id, s[0], s[1], s[2], s[3], "Local Principal", f"info@{s[0].replace(' ', '').lower()}.edu.np", "2024", "CLEC"))
        
        # Insert exact number of students
        for _ in range(s[4]):
            st_id = str(uuid.uuid4())
            gender = random.choice(["Boy", "Girl"])
            grade = random.choice(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"])
            # Distribute realistically: ~80% Active, ~20% Alumni/Graduated
            category = random.choices(["Active", "Graduated", "Alumni"], weights=[80, 10, 10])[0]
            
            c.execute("INSERT INTO student (id, student_id, gender, school_name, grade, academic_year, school_district, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (st_id, f"ST-{student_id_counter:04d}", gender, s[0], grade, "2026", s[2], category))
            student_id_counter += 1
            
        # Insert exact number of teachers
        for _ in range(s[5]):
            t_id = str(uuid.uuid4())
            t_gender = random.choice(["Male", "Female"])
            
            c.execute("INSERT INTO teacher (id, teacher_id, gender, school_name, school_district, status, email, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                      (t_id, f"T-{teacher_id_counter:04d}", t_gender, s[0], s[2], "Active", f"teacher{teacher_id_counter}@{s[0].replace(' ', '').lower()}.edu.np", "9800000000"))
            teacher_id_counter += 1

    conn.commit()
    conn.close()
    print(f"Successfully inserted {student_id_counter - 1} students and {teacher_id_counter - 1} teachers across {len(schools_data)} schools!")

if __name__ == '__main__':
    seed()
