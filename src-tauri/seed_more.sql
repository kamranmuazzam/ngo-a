-- Add more Teachers
INSERT INTO teacher (id, teacher_id, gender, school_name, school_district, status, email, contact) VALUES 
('t8', 'T-008', 'Male', 'Shree Nawajagriti Chandi', 'Gorkha', 'Active', 'ramesh.t@snc.edu.np', '9800000008'),
('t9', 'T-009', 'Female', 'Shree Nawajagriti Chandi', 'Gorkha', 'Active', 'sita.k@snc.edu.np', '9800000009'),
('t10', 'T-010', 'Male', 'Shree Adarsha', 'Syangja', 'Active', 'hari.b@adarsha.edu.np', '9800000010'),
('t11', 'T-011', 'Female', 'Shree Adarsha', 'Syangja', 'On Leave', 'gita.g@adarsha.edu.np', '9800000011'),
('t12', 'T-012', 'Male', 'Shree Triyuga', 'Udayapur', 'Active', 'shyam.s@triyuga.edu.np', '9800000012'),
('t13', 'T-013', 'Female', 'Shree Triyuga', 'Udayapur', 'Active', 'nita.m@triyuga.edu.np', '9800000013'),
('t14', 'T-014', 'Male', 'Shree Prithvi', 'Khotang', 'Active', 'kumar.r@prithvi.edu.np', '9800000014'),
('t15', 'T-015', 'Female', 'Shree Prithvi', 'Khotang', 'Retired', 'sunita.d@prithvi.edu.np', '9800000015'),
('t16', 'T-016', 'Male', 'Shree Janahit', 'Mustang', 'Active', 'pemba.s@janahit.edu.np', '9800000016'),
('t17', 'T-017', 'Female', 'Shree Janahit', 'Mustang', 'Active', 'dolma.t@janahit.edu.np', '9800000017');

-- Add more Students (Shree Nawajagriti Chandi)
INSERT INTO student (id, student_id, gender, school_name, grade, academic_year, school_district, category) VALUES 
('st14', 'ST-114', 'Boy', 'Shree Nawajagriti Chandi', '5', '2026', 'Gorkha', 'Active'),
('st15', 'ST-115', 'Girl', 'Shree Nawajagriti Chandi', '6', '2026', 'Gorkha', 'Active'),
('st16', 'ST-116', 'Boy', 'Shree Nawajagriti Chandi', '7', '2026', 'Gorkha', 'Active'),
('st17', 'ST-117', 'Girl', 'Shree Nawajagriti Chandi', '8', '2026', 'Gorkha', 'Active'),
('st18', 'ST-118', 'Boy', 'Shree Nawajagriti Chandi', '9', '2026', 'Gorkha', 'Active'),
('st19', 'ST-119', 'Girl', 'Shree Nawajagriti Chandi', '10', '2026', 'Gorkha', 'Active'),
('st20', 'ST-120', 'Boy', 'Shree Nawajagriti Chandi', '11', '2026', 'Gorkha', 'Active'),
('st21', 'ST-121', 'Girl', 'Shree Nawajagriti Chandi', '12', '2026', 'Gorkha', 'Graduated'),

-- Add more Students (Shree Adarsha)
('st22', 'ST-122', 'Boy', 'Shree Adarsha', '5', '2026', 'Syangja', 'Active'),
('st23', 'ST-123', 'Girl', 'Shree Adarsha', '6', '2026', 'Syangja', 'Active'),
('st24', 'ST-124', 'Boy', 'Shree Adarsha', '7', '2026', 'Syangja', 'Active'),
('st25', 'ST-125', 'Girl', 'Shree Adarsha', '8', '2026', 'Syangja', 'Active'),
('st26', 'ST-126', 'Boy', 'Shree Adarsha', '9', '2026', 'Syangja', 'Active'),
('st27', 'ST-127', 'Girl', 'Shree Adarsha', '10', '2026', 'Syangja', 'Active'),
('st28', 'ST-128', 'Boy', 'Shree Adarsha', '11', '2026', 'Syangja', 'Active'),
('st29', 'ST-129', 'Girl', 'Shree Adarsha', '12', '2026', 'Syangja', 'Graduated'),

-- Add more Students (Shree Triyuga)
('st30', 'ST-130', 'Boy', 'Shree Triyuga', '5', '2026', 'Udayapur', 'Active'),
('st31', 'ST-131', 'Girl', 'Shree Triyuga', '6', '2026', 'Udayapur', 'Active'),
('st32', 'ST-132', 'Boy', 'Shree Triyuga', '7', '2026', 'Udayapur', 'Active'),
('st33', 'ST-133', 'Girl', 'Shree Triyuga', '8', '2026', 'Udayapur', 'Active'),
('st34', 'ST-134', 'Boy', 'Shree Triyuga', '9', '2026', 'Udayapur', 'Active'),
('st35', 'ST-135', 'Girl', 'Shree Triyuga', '10', '2026', 'Udayapur', 'Active'),
('st36', 'ST-136', 'Boy', 'Shree Triyuga', '11', '2026', 'Udayapur', 'Active'),
('st37', 'ST-137', 'Girl', 'Shree Triyuga', '12', '2026', 'Udayapur', 'Graduated'),

-- Add more Students (Shree Prithvi)
('st38', 'ST-138', 'Boy', 'Shree Prithvi', '5', '2026', 'Khotang', 'Active'),
('st39', 'ST-139', 'Girl', 'Shree Prithvi', '6', '2026', 'Khotang', 'Active'),
('st40', 'ST-140', 'Boy', 'Shree Prithvi', '7', '2026', 'Khotang', 'Active'),
('st41', 'ST-141', 'Girl', 'Shree Prithvi', '8', '2026', 'Khotang', 'Active'),
('st42', 'ST-142', 'Boy', 'Shree Prithvi', '9', '2026', 'Khotang', 'Active'),
('st43', 'ST-143', 'Girl', 'Shree Prithvi', '10', '2026', 'Khotang', 'Active'),
('st44', 'ST-144', 'Boy', 'Shree Prithvi', '11', '2026', 'Khotang', 'Active'),
('st45', 'ST-145', 'Girl', 'Shree Prithvi', '12', '2026', 'Khotang', 'Graduated'),

-- Add more Students (Shree Janahit)
('st46', 'ST-146', 'Boy', 'Shree Janahit', '5', '2026', 'Mustang', 'Active'),
('st47', 'ST-147', 'Girl', 'Shree Janahit', '6', '2026', 'Mustang', 'Active'),
('st48', 'ST-148', 'Boy', 'Shree Janahit', '7', '2026', 'Mustang', 'Active'),
('st49', 'ST-149', 'Girl', 'Shree Janahit', '8', '2026', 'Mustang', 'Active'),
('st50', 'ST-150', 'Boy', 'Shree Janahit', '9', '2026', 'Mustang', 'Active'),
('st51', 'ST-151', 'Girl', 'Shree Janahit', '10', '2026', 'Mustang', 'Active'),
('st52', 'ST-152', 'Boy', 'Shree Janahit', '11', '2026', 'Mustang', 'Active'),
('st53', 'ST-153', 'Girl', 'Shree Janahit', '12', '2026', 'Mustang', 'Graduated');
