

export interface Teacher {
  id: string;
  name: string;
  email: string;
  password?: string; // Password assigned by D.O.S.
  subjectsAssigned: Array<{ classId: string; subjectId: string; examIds: string[] }>; // Tracks which exams for which subjects in which classes
}

export interface Student {
  id: string;
  studentIdNumber: string; // Official student ID, e.g., "S1001"
  firstName: string;
  lastName: string;
  classId: string; 
  dateOfBirth?: string; // Stored as YYYY-MM-DD string
  gender?: 'Male' | 'Female' | 'Other';
}

export interface ClassInfo {
  id: string;
  name: string; // E.g., "Form 1A"
  level: string; // E.g., "Form 1"
  stream?: string; // E.g., "A"
  classTeacherId?: string; // ID of the main class teacher
  subjects: Subject[]; // List of subjects taught in this class
}

export interface Subject {
  id: string;
  name: string; // E.g., "Mathematics"
  code?: string; // E.g., "MATH101"
}

export interface Term {
  id: string;
  name: string; // E.g., "Term 1 2024"
  year: number;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string; // ISO date string YYYY-MM-DD
}

export interface Exam { // Represents an Exam Type or a specific instance
  id: string;
  name: string; // E.g., "Midterm Exam", "Final Assessment"
  termId: string; // Links to an academic term
  examDate?: string; // Date the exam takes place (YYYY-MM-DD)
  maxMarks: number; // Default max marks for this exam type
  description?: string;
  // New fields for specific assignment
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  marksSubmissionDeadline?: string; // Specific deadline for marks submission (YYYY-MM-DD)
}

// Represents a specific assessment instance for a subject in a class for an exam type
export interface Assessment {
    id: string; // Typically examId_classId_subjectId
    examId: string;
    classId: string;
    subjectId: string;
    teacherId: string; // Teacher responsible for this assessment
    maxMarks: number; // Actual marks this assessment is out of for this specific subject
    submissionDeadline: string; // ISO date string
}

export interface Mark {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  submittedAt?: string; // ISO date string
  lastUpdatedAt?: string; // ISO date string
  comments?: string;
}

// For grade anomaly detection input (matches Genkit flow)
export interface GradeEntry {
  studentId: string; // This should map to Student.studentIdNumber
  grade: number;
}

// For displaying anomalies
export interface AnomalyExplanation {
  studentId: string;
  explanation: string;
}

// General settings
export interface GeneralSettings {
    defaultGradingScale: Array<GradingScaleItem>; 
    currentTermId?: string;
    markSubmissionTimeZone: string; 
    globalMarksSubmissionDeadline?: string; 
    dosGlobalAnnouncementText?: string;
    dosGlobalAnnouncementType?: 'info' | 'warning';
    teacherDashboardResourcesText?: string; 
}

// Grading Policy specific types
export interface GradingScaleItem {
  grade: string;
  minScore: number;
  maxScore: number;
}

export interface GradingPolicy {
  id: string;
  name: string;
  scale: GradingScaleItem[];
  isDefault?: boolean;
}

// Teacher Dashboard specific types
export interface TeacherDashboardAssignment {
  id: string; // Now examId_classId_subjectId
  className: string;
  subjectName: string; 
  examName: string; // Added exam name
  nextDeadlineInfo: string;
}

export interface TeacherNotification {
  id: string;
  message: string;
  type: 'deadline' | 'info' | 'warning';
  link?: string;
}

export interface TeacherDashboardData {
  assignments: TeacherDashboardAssignment[];
  notifications: TeacherNotification[];
  teacherName?: string;
  resourcesText?: string; 
}

