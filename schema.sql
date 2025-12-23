-- ============================================
-- HRMS Database Schema
-- ============================================
-- Created: December 19, 2025
-- Database: hrms_db_new
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS hrms_db_new;
USE hrms_db_new;

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','employee', 'hr', 'manager') DEFAULT 'employee',
  full_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Master Data Tables
-- ============================================

-- Locations Master
CREATE TABLE IF NOT EXISTS locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments Master
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Designations Master
CREATE TABLE IF NOT EXISTS designations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Business Units Master
CREATE TABLE IF NOT EXISTS business_units (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legal Entities Master
CREATE TABLE IF NOT EXISTS legal_entities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cost Centers Master
CREATE TABLE IF NOT EXISTS cost_centers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub Departments Master
CREATE TABLE IF NOT EXISTS sub_departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  department_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Bands Master
CREATE TABLE IF NOT EXISTS bands (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pay Grades Master
CREATE TABLE IF NOT EXISTS pay_grades (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Plans Master
CREATE TABLE IF NOT EXISTS leave_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  leave_year_start_month INT DEFAULT 1,
  leave_year_start_day INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Shift Policies Master
CREATE TABLE IF NOT EXISTS shift_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  shift_type ENUM('general', 'night', 'rotating', 'flexible') NOT NULL DEFAULT 'general',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INT DEFAULT 60,
  timezone VARCHAR(50) DEFAULT 'UTC',
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_shift_policy_active (is_active)
);

-- Weekly Off Policies Master
CREATE TABLE IF NOT EXISTS weekly_off_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Policies Master
CREATE TABLE IF NOT EXISTS attendance_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Capture Schemes Master
CREATE TABLE IF NOT EXISTS attendance_capture_schemes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holiday Lists Master
CREATE TABLE IF NOT EXISTS holiday_lists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expense Policies Master
CREATE TABLE IF NOT EXISTS expense_policies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Employee Management
-- ============================================

-- Employees Master
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY AUTO_INCREMENT,

  -- =========================
  -- Core Identifiers
  -- =========================
  EmployeeNumber VARCHAR(50) NOT NULL,
  attendance_number VARCHAR(50),

  -- =========================
  -- Name
  -- =========================
  FirstName VARCHAR(100),
  MiddleName VARCHAR(100),
  LastName VARCHAR(100),
  FullName VARCHAR(255),

  -- =========================
  -- Contact
  -- =========================
  WorkEmail VARCHAR(150),
  PersonalEmail VARCHAR(150),

  -- =========================
  -- Personal
  -- =========================
  Gender VARCHAR(20),
  MaritalStatus VARCHAR(20),
  BloodGroup VARCHAR(50),
  PhysicallyHandicapped TINYINT(1) DEFAULT 0,
  Nationality VARCHAR(50),
  DateOfBirth DATE,

  -- =========================
  -- Address (Current)
  -- =========================
  current_address_line1 TEXT,
  current_address_line2 TEXT,
  current_city VARCHAR(100),
  current_state VARCHAR(100),
  current_zip VARCHAR(20),
  current_country VARCHAR(100),

  -- =========================
  -- Address (Permanent)
  -- =========================
  permanent_address_line1 TEXT,
  permanent_address_line2 TEXT,
  permanent_city VARCHAR(100),
  permanent_state VARCHAR(100),
  permanent_zip VARCHAR(20),
  permanent_country VARCHAR(100),

  -- =========================
  -- Family
  -- =========================
  father_name VARCHAR(150),
  mother_name VARCHAR(150),
  spouse_name VARCHAR(150),
  children_names TEXT,

  -- =========================
  -- Employment
  -- =========================
  DateJoined DATE,
  time_type VARCHAR(50),
  worker_type VARCHAR(50),
  EmploymentStatus VARCHAR(50),
  notice_period INT,

  -- =========================
  -- Organization Mapping
  -- =========================
  LocationId INT,
  DepartmentId INT,
  SubDepartmentId INT,
  DesignationId INT,
  SecondaryDesignationId INT,
  BusinessUnitId INT,
  LegalEntityId INT,
  BandId INT,
  PayGradeId INT,
  CostCenterId INT,
  reporting_manager_id INT,
  dotted_line_manager_id INT,

  -- =========================
  -- Policies
  -- =========================
  leave_plan_id INT,
  shift_policy_id INT,
  weekly_off_policy_id INT,
  attendance_policy_id INT,
  attendance_capture_scheme_id INT,
  holiday_list_id INT,
  expense_policy_id INT,

  -- =========================
  -- Statutory
  -- =========================
  PANNumber VARCHAR(20),
  AadhaarNumber VARCHAR(20),
  pf_number VARCHAR(30),
  uan_number VARCHAR(30),

  -- =========================
  -- Compensation (Existing)
  -- =========================
  lpa DECIMAL(15,2),
  basic_pct DECIMAL(5,2),
  hra_pct DECIMAL(5,2),
  medical_allowance DECIMAL(10,2),
  transport_allowance DECIMAL(10,2),
  special_allowance DECIMAL(10,2),
  paid_basic_monthly DECIMAL(10,2),
  working_days INT,
  loss_of_days INT,

  -- =========================
  -- Exit / Separation
  -- =========================
  exit_date DATE,
  exit_status VARCHAR(50),
  termination_type VARCHAR(100),
  termination_reason VARCHAR(200),
  resignation_note TEXT,
  comments TEXT,

  -- =========================
  -- Audit
  -- =========================
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- =========================
  -- Constraints & Indexes
  -- =========================
  UNIQUE KEY uk_employee_number (EmployeeNumber),
  UNIQUE KEY uk_work_email (WorkEmail),

  -- =========================
  -- Foreign Keys
  -- =========================
  FOREIGN KEY (LocationId) REFERENCES locations(id),
  FOREIGN KEY (DepartmentId) REFERENCES departments(id),
  FOREIGN KEY (SubDepartmentId) REFERENCES sub_departments(id),
  FOREIGN KEY (DesignationId) REFERENCES designations(id),
  FOREIGN KEY (SecondaryDesignationId) REFERENCES designations(id),
  FOREIGN KEY (BusinessUnitId) REFERENCES business_units(id),
  FOREIGN KEY (LegalEntityId) REFERENCES legal_entities(id),
  FOREIGN KEY (BandId) REFERENCES bands(id),
  FOREIGN KEY (PayGradeId) REFERENCES pay_grades(id),
  FOREIGN KEY (CostCenterId) REFERENCES cost_centers(id),
  FOREIGN KEY (leave_plan_id) REFERENCES leave_plans(id),
  FOREIGN KEY (shift_policy_id) REFERENCES shift_policies(id),
  FOREIGN KEY (weekly_off_policy_id) REFERENCES weekly_off_policies(id),
  FOREIGN KEY (attendance_policy_id) REFERENCES attendance_policies(id),
  FOREIGN KEY (attendance_capture_scheme_id) REFERENCES attendance_capture_schemes(id),
  FOREIGN KEY (holiday_list_id) REFERENCES holiday_lists(id),
  FOREIGN KEY (expense_policy_id) REFERENCES expense_policies(id),
  FOREIGN KEY (reporting_manager_id) REFERENCES employees(id),
  FOREIGN KEY (dotted_line_manager_id) REFERENCES employees(id)
);

-- Employee Pay Details
CREATE TABLE IF NOT EXISTS emp_pay_details (
  -- Primary Key, auto-incrementing
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Foreign Key linking back to the employees master table
  employee_id INT UNIQUE NOT NULL,
  
  -- Compensation Components
  basic DECIMAL(10, 2) DEFAULT 0.00,
  hra DECIMAL(10, 2) DEFAULT 0.00,
  medical_allowance DECIMAL(10, 2) DEFAULT 0.00,
  transport_allowance DECIMAL(10, 2) DEFAULT 0.00,
  special_allowance DECIMAL(10, 2) DEFAULT 0.00,
  meal_coupons DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Other pay details
  annual_ctc DECIMAL(12, 2) DEFAULT 0.00,
  bank_account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  payment_mode VARCHAR(50), -- e.g., 'Bank Transfer', 'Cash'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Define the Foreign Key constraint
  FOREIGN KEY (employee_id) 
    REFERENCES employees(id) 
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- ============================================
-- Attendance Management
-- ============================================

-- Attendance Table (Daily Summary)
CREATE TABLE IF NOT EXISTS attendance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  attendance_date DATE NOT NULL,
  punch_date DATE NOT NULL,
  first_check_in DATETIME,
  last_check_out DATETIME,
  total_work_hours DECIMAL(5,2) DEFAULT 0,
  total_break_hours DECIMAL(5,2) DEFAULT 0,
  gross_hours DECIMAL(5,2) DEFAULT 0,
  work_mode ENUM('Office', 'WFH', 'Remote', 'Hybrid') DEFAULT 'Office',
  location VARCHAR(255),
  status ENUM('present', 'absent', 'half-day', 'late', 'on-leave') DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  UNIQUE KEY unique_employee_date (employee_id, attendance_date),
  KEY idx_employee_date (employee_id, attendance_date)
);

-- Attendance Punches (Multiple Punch In/Out per day)
CREATE TABLE IF NOT EXISTS attendance_punches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  attendance_id INT NOT NULL,
  employee_id INT NOT NULL,
  punch_type ENUM('in', 'out') NOT NULL,
  punch_time DATETIME NOT NULL,
  punch_date DATE NOT NULL,
  ip_address VARCHAR(50),
  device_info VARCHAR(255),
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  KEY idx_attendance_punch (attendance_id, punch_time),
  KEY idx_employee_punch_date (employee_id, punch_date)
);

-- ============================================
-- Timesheet Management
-- ============================================

-- Timesheets Table (Basic/Legacy)
-- Enhanced Timesheets Table (Both Regular and Project-based)
CREATE TABLE IF NOT EXISTS timesheets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  project_id INT NULL,
  date DATE NOT NULL,
  timesheet_type ENUM('regular', 'project') NOT NULL DEFAULT 'regular',
  
  -- Hourly breakdown (JSON format: [{hour: "09:00-10:00", task: "Development", hours: 1}])
  hours_breakdown JSON,
  total_hours DECIMAL(5,2) NOT NULL,
  work_description TEXT,
  notes TEXT,
  
  -- Submission info
  status ENUM('draft', 'submitted', 'verified', 'rejected') DEFAULT 'draft',
  submission_date TIMESTAMP NULL,
  
  -- Internal verification
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  
  -- Client timesheet (for project-based)
  client_timesheet_file VARCHAR(500),
  client_timesheet_upload_date TIMESTAMP NULL,
  client_timesheet_status ENUM('pending_validation', 'validated', 'rejected', 'mismatch') NULL,
  validation_remarks TEXT,
  client_reported_hours DECIMAL(5,2),
  validated_by INT NULL,
  validated_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (verified_by) REFERENCES users(id),
  FOREIGN KEY (validated_by) REFERENCES users(id),
  
  INDEX idx_timesheet_employee_date (employee_id, date),
  INDEX idx_timesheet_project (project_id),
  INDEX idx_timesheet_type (timesheet_type),
  INDEX idx_timesheet_status (status),
  INDEX idx_client_validation (client_timesheet_status),
  
  UNIQUE KEY unique_employee_project_date (employee_id, project_id, date, timesheet_type)
);

-- ============================================
-- Project Work Updates & Client Timesheet Verification
-- ============================================

-- Projects Master Table
CREATE TABLE IF NOT EXISTS projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_code VARCHAR(50) UNIQUE NOT NULL,
  project_name VARCHAR(255) NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status ENUM('active', 'on_hold', 'completed', 'cancelled') DEFAULT 'active',
  description TEXT,
  project_manager_id INT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_manager_id) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_project_status (status),
  INDEX idx_project_dates (start_date, end_date)
);

-- Project Shifts Configuration
CREATE TABLE IF NOT EXISTS project_shifts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  project_id INT NOT NULL,
  shift_type ENUM('general', 'night', 'rotating') NOT NULL,
  shift_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_project_shift (project_id, is_active)
);

-- Project Employee Assignments
CREATE TABLE IF NOT EXISTS project_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  shift_id INT,
  assignment_start_date DATE NOT NULL,
  assignment_end_date DATE,
  role_in_project VARCHAR(100),
  allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
  status ENUM('active', 'bench', 'completed', 'transferred') DEFAULT 'active',
  assigned_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES project_shifts(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by) REFERENCES users(id),
  INDEX idx_employee_project (employee_id, status),
  INDEX idx_project_assignments (project_id, status),
  INDEX idx_assignment_dates (assignment_start_date, assignment_end_date)
);

-- Employee Daily Work Updates
CREATE TABLE IF NOT EXISTS work_updates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  shift_id INT,
  update_date DATE NOT NULL,
  shift_start_time DATETIME NOT NULL,
  shift_end_time DATETIME NOT NULL,
  hours_worked DECIMAL(5,2) NOT NULL,
  work_description TEXT NOT NULL,
  tasks_completed TEXT,
  challenges_faced TEXT,
  status ENUM('draft', 'submitted', 'approved', 'flagged', 'rejected') DEFAULT 'draft',
  submission_timestamp TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES project_shifts(id) ON DELETE SET NULL,
  UNIQUE KEY unique_employee_project_date (employee_id, project_id, update_date),
  INDEX idx_work_update_date (update_date, status),
  INDEX idx_employee_updates (employee_id, update_date),
  INDEX idx_project_updates (project_id, update_date)
);

-- Client Timesheet Uploads
CREATE TABLE IF NOT EXISTS client_timesheets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_update_id INT NOT NULL,
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  timesheet_date DATE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_verified TINYINT(1) DEFAULT 0,
  FOREIGN KEY (work_update_id) REFERENCES work_updates(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_timesheet_verification (is_verified, timesheet_date),
  INDEX idx_employee_timesheets (employee_id, timesheet_date)
);

-- Admin Verification & Approval
CREATE TABLE IF NOT EXISTS timesheet_verifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_update_id INT NOT NULL,
  client_timesheet_id INT,
  verified_by INT NOT NULL,
  verification_status ENUM('approved', 'flagged', 'rejected') NOT NULL,
  verification_notes TEXT,
  hours_discrepancy DECIMAL(5,2) DEFAULT 0.00,
  verification_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (work_update_id) REFERENCES work_updates(id) ON DELETE CASCADE,
  FOREIGN KEY (client_timesheet_id) REFERENCES client_timesheets(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id),
  INDEX idx_verification_status (verification_status, verification_timestamp)
);

-- Compliance Tracking
CREATE TABLE IF NOT EXISTS timesheet_compliance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  compliance_date DATE NOT NULL,
  shift_id INT,
  has_work_update TINYINT(1) DEFAULT 0,
  has_client_timesheet TINYINT(1) DEFAULT 0,
  compliance_status ENUM('compliant', 'update_only', 'missing', 'partial') DEFAULT 'missing',
  reminder_sent TINYINT(1) DEFAULT 0,
  reminder_count INT DEFAULT 0,
  last_reminder_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (shift_id) REFERENCES project_shifts(id) ON DELETE SET NULL,
  UNIQUE KEY unique_compliance_record (employee_id, project_id, compliance_date),
  INDEX idx_compliance_status (compliance_status, compliance_date),
  INDEX idx_compliance_reminder (reminder_sent, compliance_date)
);

-- Audit Log for All Timesheet Actions
CREATE TABLE IF NOT EXISTS timesheet_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  entity_type ENUM('work_update', 'client_timesheet', 'verification', 'compliance') NOT NULL,
  entity_id INT NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_by INT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (action_by) REFERENCES users(id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_timestamp (action_timestamp)
);

-- Timesheet Notification Queue
CREATE TABLE IF NOT EXISTS timesheet_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  project_id INT NOT NULL,
  notification_type ENUM('reminder', 'escalation', 'approval', 'rejection') NOT NULL,
  notification_channel ENUM('email', 'in_app', 'sms') NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  sent_at TIMESTAMP NULL,
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_notification_status (status, scheduled_at)
);

-- Payroll Period Lock Status
CREATE TABLE IF NOT EXISTS payroll_period_locks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payroll_period VARCHAR(20) NOT NULL,
  lock_status ENUM('open', 'review', 'locked', 'processed') DEFAULT 'open',
  pending_verifications INT DEFAULT 0,
  flagged_submissions INT DEFAULT 0,
  locked_by INT,
  locked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_payroll_period (payroll_period),
  FOREIGN KEY (locked_by) REFERENCES users(id)
);

-- Employee Compliance Summary View
CREATE OR REPLACE VIEW v_employee_compliance_summary AS
SELECT 
  e.id AS employee_id,
  e.EmployeeNumber AS employee_code,
  e.FirstName AS first_name,
  e.LastName AS last_name,
  pa.project_id,
  p.project_name,
  p.client_name,
  tc.compliance_date,
  tc.compliance_status,
  tc.has_work_update,
  tc.has_client_timesheet,
  tc.reminder_count,
  ps.shift_name,
  ps.shift_type
FROM employees e
INNER JOIN project_assignments pa ON e.id = pa.employee_id AND pa.status = 'active'
INNER JOIN projects p ON pa.project_id = p.id
LEFT JOIN timesheet_compliance tc ON e.id = tc.employee_id 
  AND pa.project_id = tc.project_id
  AND tc.compliance_date = CURDATE()
LEFT JOIN project_shifts ps ON pa.shift_id = ps.id
WHERE pa.status = 'active';

-- Admin Dashboard Traffic Light View
CREATE OR REPLACE VIEW v_admin_compliance_dashboard AS
SELECT 
  p.id AS project_id,
  p.project_name,
  p.client_name,
  DATE(tc.compliance_date) AS compliance_date,
  COUNT(DISTINCT tc.employee_id) AS total_employees,
  SUM(CASE WHEN tc.compliance_status = 'compliant' THEN 1 ELSE 0 END) AS compliant_count,
  SUM(CASE WHEN tc.compliance_status = 'update_only' THEN 1 ELSE 0 END) AS update_only_count,
  SUM(CASE WHEN tc.compliance_status = 'missing' THEN 1 ELSE 0 END) AS missing_count,
  CASE 
    WHEN SUM(CASE WHEN tc.compliance_status = 'compliant' THEN 1 ELSE 0 END) = COUNT(DISTINCT tc.employee_id) THEN 'green'
    WHEN SUM(CASE WHEN tc.compliance_status IN ('update_only', 'partial') THEN 1 ELSE 0 END) > 0 THEN 'yellow'
    ELSE 'red'
  END AS traffic_light_status
FROM projects p
INNER JOIN timesheet_compliance tc ON p.id = tc.project_id
WHERE p.status = 'active'
GROUP BY p.id, p.project_name, p.client_name, DATE(tc.compliance_date);

-- ============================================
-- Leave Management
-- ============================================

-- Leave Types Master
CREATE TABLE IF NOT EXISTS leave_types (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type_name VARCHAR(50) UNIQUE NOT NULL,
  type_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  is_paid TINYINT(1) DEFAULT 1,
  requires_approval TINYINT(1) DEFAULT 1,
  can_carry_forward TINYINT(1) DEFAULT 0,
  max_carry_forward_days INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Leave Plan Allocations (which leave types are included in each plan with day limits)
CREATE TABLE IF NOT EXISTS leave_plan_allocations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  leave_plan_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  days_allocated INT NOT NULL,
  prorate_on_joining TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_plan_id) REFERENCES leave_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
  UNIQUE KEY unique_plan_leave_type (leave_plan_id, leave_type_id)
);

-- Employee Leave Balances (tracks allocated, used, available leaves for each employee)
CREATE TABLE IF NOT EXISTS employee_leave_balances (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  leave_year INT NOT NULL,
  allocated_days DECIMAL(5,2) DEFAULT 0,
  used_days DECIMAL(5,2) DEFAULT 0,
  carry_forward_days DECIMAL(5,2) DEFAULT 0,
  available_days DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  UNIQUE KEY unique_employee_leave_year (employee_id, leave_type_id, leave_year),
  INDEX idx_employee_year (employee_id, leave_year)
);

-- Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  leave_type_id INT,
  leave_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  approver_id INT,
  approval_date TIMESTAMP NULL,
  rejection_reason TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  FOREIGN KEY (approver_id) REFERENCES users(id),
  INDEX idx_employee_status (employee_id, status),
  INDEX idx_leave_dates (start_date, end_date)
);

-- ============================================
-- Payroll Management
-- ============================================

-- Payroll Runs Table
CREATE TABLE IF NOT EXISTS payroll_runs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payroll_month VARCHAR(20),
  payroll_type VARCHAR(50) DEFAULT 'regular',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Slips Table
CREATE TABLE IF NOT EXISTS payroll_slips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  payroll_run_id INT NOT NULL,
  employee_id INT NOT NULL,
  employment_status VARCHAR(50),
  date_of_joining DATE,
  date_of_birth DATE,
  location_name VARCHAR(100),
  department_name VARCHAR(100),
  job_title VARCHAR(100),
  payroll_status VARCHAR(50),
  status_description VARCHAR(255),
  warnings TEXT,
  actual_payable_days DECIMAL(5,2),
  working_days DECIMAL(5,2),
  loss_of_pay_days DECIMAL(5,2),
  days_payable DECIMAL(5,2),
  payable_units DECIMAL(10,2),
  remuneration_amount DECIMAL(15,2),
  basic DECIMAL(15,2),
  hra DECIMAL(15,2),
  medical_allowance DECIMAL(15,2),
  transport_allowance DECIMAL(15,2),
  special_allowance DECIMAL(15,2),
  meal_coupons DECIMAL(15,2),
  mobile_internet_allowance DECIMAL(15,2),
  newspaper_journal_allowance DECIMAL(15,2),
  child_education_allowance DECIMAL(15,2),
  incentives DECIMAL(15,2),
  other_reimbursement DECIMAL(15,2),
  relocation_bonus DECIMAL(15,2),
  gross_amount DECIMAL(15,2),
  pf_employer DECIMAL(15,2),
  esi_employer DECIMAL(15,2),
  total_employer_contributions DECIMAL(15,2),
  pf_employee DECIMAL(15,2),
  esi_employee DECIMAL(15,2),
  total_contributions DECIMAL(15,2),
  professional_tax DECIMAL(15,2),
  total_income_tax DECIMAL(15,2),
  loan_deduction DECIMAL(15,2),
  meal_coupon_service_charge DECIMAL(15,2),
  other_deduction DECIMAL(15,2),
  meal_coupon_deduction DECIMAL(15,2),
  total_deductions DECIMAL(15,2),
  net_pay DECIMAL(15,2),
  cash_advance DECIMAL(15,2),
  settlement_against_advance DECIMAL(15,2),
  social_media_login_invoice DECIMAL(15,2),
  total_reimbursements DECIMAL(15,2),
  total_net_pay DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Payroll Defaults Table
CREATE TABLE IF NOT EXISTS payroll_defaults (
  id INT PRIMARY KEY AUTO_INCREMENT,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  key_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Salary Structures Table
CREATE TABLE IF NOT EXISTS salary_structures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  component_name VARCHAR(100),
  component_value DECIMAL(15,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================
-- Onboarding Management
-- ============================================

-- Onboarding Steps Table
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id INT PRIMARY KEY AUTO_INCREMENT,
  step_name VARCHAR(100),
  order_num INT,
  required TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding Progress Table
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  step_id INT NOT NULL,
  status VARCHAR(20),
  completed_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (step_id) REFERENCES onboarding_steps(id)
);

-- ============================================
-- Holiday Management
-- ============================================

-- Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id INT PRIMARY KEY AUTO_INCREMENT,
  holiday_date DATE UNIQUE NOT NULL,
  holiday_name VARCHAR(100),
  day_name VARCHAR(20),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Communication & Support
-- ============================================

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  body TEXT,
  created_by INT,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50) DEFAULT 'Open',
  priority VARCHAR(20) DEFAULT 'Medium',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  message TEXT,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- HR Engagement
-- ============================================

-- Birthday Wishes Table
CREATE TABLE IF NOT EXISTS birthday_wishes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT,
  employee_id INT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============================================
-- CANDIDATES & PRE-ONBOARDING TABLES
-- ============================================

-- Candidates Table (Pre-onboarding stage)
CREATE TABLE IF NOT EXISTS candidates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  candidate_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  alternate_phone VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  
  -- Position Details
  position VARCHAR(150),
  designation_id INT,
  department_id INT,
  location_id INT,
  offered_ctc DECIMAL(15,2),
  joining_date DATE,
  reporting_manager_id INT,
  
  -- Offer Details
  offer_letter_sent TINYINT(1) DEFAULT 0,
  offer_letter_sent_date DATE,
  offer_accepted TINYINT(1) DEFAULT 0,
  offer_accepted_date DATE,
  offer_declined TINYINT(1) DEFAULT 0,
  offer_declined_date DATE,
  decline_reason TEXT,
  
  -- Pre-onboarding Status
  status ENUM('offered', 'offer_accepted', 'offer_declined', 'documents_pending', 'bgv_initiated', 'bgv_completed', 'ready_to_join', 'joined', 'dropped_out') DEFAULT 'offered',
  
  -- Background Verification
  bgv_status ENUM('not_started', 'initiated', 'in_progress', 'completed', 'failed') DEFAULT 'not_started',
  bgv_initiated_date DATE,
  bgv_completed_date DATE,
  bgv_remarks TEXT,
  
  -- Documents Status
  documents_submitted TINYINT(1) DEFAULT 0,
  documents_verified TINYINT(1) DEFAULT 0,
  
  -- Portal Access
  portal_access_given TINYINT(1) DEFAULT 0,
  portal_username VARCHAR(100),
  portal_password_set TINYINT(1) DEFAULT 0,
  
  -- Converted to Employee
  converted_to_employee TINYINT(1) DEFAULT 0,
  employee_id INT,
  conversion_date DATE,
  
  -- HR Details
  hr_coordinator_id INT,
  recruiter_name VARCHAR(150),
  recruitment_source VARCHAR(100),
  
  -- Audit
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (designation_id) REFERENCES designations(id),
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (location_id) REFERENCES locations(id),
  FOREIGN KEY (reporting_manager_id) REFERENCES employees(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (hr_coordinator_id) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Candidate Documents Table
CREATE TABLE IF NOT EXISTS candidate_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  
  document_type ENUM('photo', 'resume', 'offer_letter', 'id_proof', 'address_proof', 'pan_card', 
                     'aadhar_card', 'education_certificate', 'experience_certificate', 
                     'relieving_letter', 'salary_slip', 'bank_passbook', 'cancelled_cheque', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500),
  file_size INT,
  mime_type VARCHAR(100),
  
  uploaded_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified TINYINT(1) DEFAULT 0,
  verified_by INT,
  verified_date DATE,
  verification_remarks TEXT,
  
  required TINYINT(1) DEFAULT 1,
  
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Pre-onboarding Tasks Table
CREATE TABLE IF NOT EXISTS preonboarding_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_name VARCHAR(255) NOT NULL,
  description TEXT,
  task_category ENUM('document_submission', 'form_filling', 'verification', 'system_setup', 'other') DEFAULT 'other',
  is_mandatory TINYINT(1) DEFAULT 1,
  task_order INT,
  auto_assign TINYINT(1) DEFAULT 1,
  assigned_to_role ENUM('candidate', 'hr', 'manager', 'admin') DEFAULT 'candidate',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Candidate Task Progress Table
CREATE TABLE IF NOT EXISTS candidate_task_progress (
  id INT PRIMARY KEY AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  task_id INT NOT NULL,
  
  status ENUM('not_started', 'in_progress', 'completed', 'blocked', 'skipped') DEFAULT 'not_started',
  assigned_date DATE,
  due_date DATE,
  started_date DATE,
  completed_date DATE,
  
  completed_by INT,
  remarks TEXT,
  
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES preonboarding_tasks(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- Onboarding Timeline/Events Table
CREATE TABLE IF NOT EXISTS onboarding_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  
  event_type ENUM('welcome_email', 'system_access', 'orientation', 'buddy_assigned', 
                  'team_introduction', 'training_scheduled', 'asset_allocation', 
                  'first_day', 'week_1_check', 'month_1_check', 'probation_review', 'other') NOT NULL,
  event_title VARCHAR(255) NOT NULL,
  event_description TEXT,
  event_date DATE,
  event_time TIME,
  
  status ENUM('scheduled', 'completed', 'cancelled', 'rescheduled') DEFAULT 'scheduled',
  completed_date TIMESTAMP,
  
  assigned_to INT,
  location VARCHAR(255),
  meeting_link VARCHAR(500),
  
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES employees(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Onboarding Buddy System Table
CREATE TABLE IF NOT EXISTS onboarding_buddies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  new_employee_id INT NOT NULL,
  buddy_employee_id INT NOT NULL,
  
  assigned_date DATE NOT NULL,
  end_date DATE,
  is_active TINYINT(1) DEFAULT 1,
  
  buddy_feedback TEXT,
  new_employee_feedback TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (new_employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (buddy_employee_id) REFERENCES employees(id)
);

-- Asset Allocation Table
CREATE TABLE IF NOT EXISTS asset_allocations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  employee_id INT NOT NULL,
  
  asset_type ENUM('laptop', 'desktop', 'mobile', 'tablet', 'keyboard', 'mouse', 
                  'headset', 'monitor', 'docking_station', 'chair', 'desk', 
                  'id_card', 'access_card', 'other') NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_id VARCHAR(100),
  serial_number VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  
  allocated_date DATE NOT NULL,
  expected_return_date DATE,
  returned_date DATE,
  
  condition_at_allocation ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
  condition_at_return ENUM('good', 'fair', 'poor', 'damaged', 'lost'),
  
  allocation_remarks TEXT,
  return_remarks TEXT,
  
  status ENUM('allocated', 'returned', 'damaged', 'lost', 'under_repair') DEFAULT 'allocated',
  
  allocated_by INT,
  received_by INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (allocated_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Candidate Communication Log Table
CREATE TABLE IF NOT EXISTS candidate_communications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  candidate_id INT NOT NULL,
  
  communication_type ENUM('email', 'phone', 'sms', 'whatsapp', 'meeting', 'other') NOT NULL,
  subject VARCHAR(255),
  message TEXT,
  
  communication_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  communicated_by INT,
  
  response_received TINYINT(1) DEFAULT 0,
  response_date TIMESTAMP,
  response_text TEXT,
  
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (communicated_by) REFERENCES users(id)
);

-- Indexes for better performance
CREATE INDEX idx_candidate_email ON candidates(email);
CREATE INDEX idx_candidate_status ON candidates(status);
CREATE INDEX idx_candidate_joining_date ON candidates(joining_date);
CREATE INDEX idx_candidate_docs_type ON candidate_documents(candidate_id, document_type);
CREATE INDEX idx_task_progress_status ON candidate_task_progress(candidate_id, status);
CREATE INDEX idx_onboarding_events_date ON onboarding_events(employee_id, event_date);
CREATE INDEX idx_asset_allocations_status ON asset_allocations(employee_id, status);

-- ============================================
-- Post-Creation Modifications
-- ============================================

-- Convert users.role from ENUM to VARCHAR for flexibility
ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'employee';

-- ============================================
-- End of Schema
-- ============================================
