DELETE FROM school;
DELETE FROM student;
DELETE FROM teacher;
DELETE FROM training;

-- Schools
INSERT INTO school (id, school_name, province, district, local_level, principal_name, email_id, clec_established_year, clec_category) VALUES 
('s1', 'Shree Nawajagriti Chandi', 'Gandaki', 'Gorkha', 'Bhimsenthapa', 'Ram Bahadur', 'info@snc.edu.np', '2023', 'Full CLEC'),
('s2', 'Shree Adarsha', 'Gandaki', 'Syangja', 'Syangja', 'Sita Sharma', 'info@adarsha.edu.np', '2024', 'Pioneer CLEC'),
('s3', 'Shree Triyuga', 'Koshi', 'Udayapur', 'Udayapur', 'Hari Krishna', 'info@triyuga.edu.np', '2025', 'Urban CLEC'),
('s4', 'Shree Prithvi', 'Koshi', 'Khotang', 'Khotang', 'Gita Devi', 'info@prithvi.edu.np', '2024', 'Model CLEC'),
('s5', 'Shree Janahit', 'Gandaki', 'Mustang', 'Mustang', 'Karma Lama', 'info@janahit.edu.np', '2023', 'Engineering Focus');

-- Teachers
INSERT INTO teacher (id, teacher_id, gender, school_name, school_district, status, email, contact) VALUES 
('t1', 'T-001', 'Male', 'Shree Nawajagriti Chandi', 'Gorkha', 'Active', 'ram.b@snc.edu.np', '9800000001'),
('t2', 'T-002', 'Female', 'Shree Nawajagriti Chandi', 'Gorkha', 'Active', 'sita.t@snc.edu.np', '9800000002'),
('t3', 'T-003', 'Female', 'Shree Adarsha', 'Syangja', 'Active', 'geeta.s@adarsha.edu.np', '9800000003'),
('t4', 'T-004', 'Male', 'Shree Adarsha', 'Syangja', 'On Leave', 'hari.p@adarsha.edu.np', '9800000004'),
('t5', 'T-005', 'Male', 'Shree Triyuga', 'Udayapur', 'Active', 'shyam.k@triyuga.edu.np', '9800000005'),
('t6', 'T-006', 'Female', 'Shree Prithvi', 'Khotang', 'Active', 'mina.b@prithvi.edu.np', '9800000006'),
('t7', 'T-007', 'Male', 'Shree Janahit', 'Mustang', 'Active', 'tenzin.l@janahit.edu.np', '9800000007');

-- Students (Active and Alumni)
INSERT INTO student (id, student_id, gender, school_name, grade, academic_year, school_district, category) VALUES 
('st1', 'ST-101', 'Boy', 'Shree Nawajagriti Chandi', '10', '2026', 'Gorkha', 'Active'),
('st2', 'ST-102', 'Girl', 'Shree Nawajagriti Chandi', '9', '2026', 'Gorkha', 'Active'),
('st3', 'ST-103', 'Boy', 'Shree Nawajagriti Chandi', '12', '2025', 'Gorkha', 'Graduated'),
('st4', 'ST-104', 'Girl', 'Shree Adarsha', '11', '2026', 'Syangja', 'Active'),
('st5', 'ST-105', 'Boy', 'Shree Adarsha', '10', '2026', 'Syangja', 'Active'),
('st6', 'ST-106', 'Girl', 'Shree Adarsha', '12', '2024', 'Syangja', 'Alumni'),
('st7', 'ST-107', 'Boy', 'Shree Triyuga', '8', '2026', 'Udayapur', 'Active'),
('st8', 'ST-108', 'Girl', 'Shree Triyuga', '8', '2026', 'Udayapur', 'Active'),
('st9', 'ST-109', 'Boy', 'Shree Triyuga', '12', '2025', 'Udayapur', 'Completed'),
('st10', 'ST-110', 'Girl', 'Shree Prithvi', '10', '2026', 'Khotang', 'Active'),
('st11', 'ST-111', 'Boy', 'Shree Prithvi', '9', '2026', 'Khotang', 'Active'),
('st12', 'ST-112', 'Girl', 'Shree Janahit', '11', '2026', 'Mustang', 'Active'),
('st13', 'ST-113', 'Boy', 'Shree Janahit', '12', '2026', 'Mustang', 'Active');

-- Trainings
INSERT INTO training (id, training_title, credit_course, start_date, end_date, participant_name, school_name, email_id) VALUES 
('tr1', 'CLEC Basic Setup', 'Yes', '2025-01-10', '2025-01-12', 'Ram Bahadur', 'Shree Nawajagriti Chandi', 'ram.b@snc.edu.np'),
('tr2', 'CLEC Basic Setup', 'Yes', '2025-01-10', '2025-01-12', 'Sita Sharma', 'Shree Adarsha', 'sita.t@snc.edu.np'),
('tr3', 'Advanced AI Tools in Classroom', 'Yes', '2026-03-05', '2026-03-08', 'Hari Krishna', 'Shree Triyuga', 'shyam.k@triyuga.edu.np'),
('tr4', 'Advanced AI Tools in Classroom', 'Yes', '2026-03-05', '2026-03-08', 'Gita Devi', 'Shree Prithvi', 'mina.b@prithvi.edu.np'),
('tr5', 'AutoCAD for Engineering', 'No', '2026-05-20', '2026-05-25', 'Karma Lama', 'Shree Janahit', 'tenzin.l@janahit.edu.np');
