

import type { Timestamp } from "firebase/firestore";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  password?: string;
  subjectsAssigned: Array<{ classId: string; subjectId: string; examIds: string[] }>;
}

export interface Student {
  id: string;
  studentIdNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface ClassInfo {
  id: string;
  name: string;
  level: string;
  stream?: string;
  classTeacherId?: string;
  subjects: Subject[]; // Array of Subject objects, not just IDs
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
}

export interface Term {
  id: string;
  name: string;
  year: number;
  startDate: string; // Should be ISO string date e.g., "YYYY-MM-DD"
  endDate: string;   // Should be ISO string date e.g., "YYYY-MM-DD"
}

export interface Exam {
  id: string;
  name: string;
  termId: string;
  examDate?: string; // Should be ISO string date e.g., "YYYY-MM-DD"
  maxMarks: number;
  description?: string;
  classId?: string; // Firestore document ID of the class
  subjectId?: string; // Firestore document ID of the subject
  teacherId?: string; // Firestore document ID of the teacher
  marksSubmissionDeadline?: string; // Should be ISO string date e.g., "YYYY-MM-DD"
  gradingPolicyId?: string; // The ID of the assigned GradingPolicy
}

// This type is used for internal representation, e.g., when constructing dropdowns.
// The actual submission will use the composite assessmentId.
export interface AssessmentContext {
    examId: string; // Firestore document ID for the exam
    classId: string; // Firestore document ID for the class
    subjectId: string; // Firestore document ID for the subject
    teacherId: string; // Firestore document ID for the teacher
    maxMarks: number;
    submissionDeadline?: string; // ISO string date
    // Human-readable names
    className: string;
    subjectName: string;
    examName: string;
}


export interface Mark {
  id: string; // Firestore document ID of the mark record (if individual marks are stored)
  assessmentId: string; // Composite ID: examDocId_classDocId_subjectDocId
  studentId: string; // Student's official ID number (studentIdNumber)
  score: number | null;
  submittedAt?: string; // ISO string
  lastUpdatedAt?: string; // ISO string
  comments?: string;
}

export interface GradeEntry {
  studentId: string; // Student's official ID number (studentIdNumber)
  grade: number;
}

export interface AnomalyExplanation {
  studentId: string; // Student's official ID number (studentIdNumber)
  explanation: string;
}

export interface GeneralSettings {
    defaultGradingScale: Array<GradingScaleItem>;
    currentTermId?: string;
    markSubmissionTimeZone: string;
    globalMarksSubmissionDeadline?: string; // ISO string date
    dosGlobalAnnouncementText?: string;
    dosGlobalAnnouncementType?: 'info' | 'warning';
    dosGlobalAnnouncementImageUrl?: string;
    teacherDashboardResourcesText?: string;
}

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

// For Teacher Dashboard - list of assessments they need to act on
export interface TeacherDashboardAssignment {
  id: string; // Composite ID: examDocId_classDocId_subjectDocId
  className: string;
  subjectName: string;
  examName: string;
  nextDeadlineInfo: string; // Formatted deadline string
}

export interface TeacherNotification {
  id: string;
  message: string;
  type: 'deadline' | 'info' | 'warning';
  link?: string;
  imageUrl?: string;
}

export interface TeacherStats {
  assignedClassesCount: number;
  subjectsTaughtCount: number;
  recentSubmissionsCount: number; // Number of submissions in the last 7 days by this teacher
}

export interface TeacherDashboardData {
  assignments: TeacherDashboardAssignment[];
  notifications: TeacherNotification[];
  teacherName?: string;
  resourcesText?: string;
  stats: TeacherStats;
}

// For Firestore structure of markSubmissions
export interface MarkSubmissionFirestoreRecord {
  teacherId: string;
  assessmentId: string; // Composite key: examDocumentId_classDocumentId_subjectDocumentId
  assessmentName: string; // Derived human-readable: Class Name - Subject Name - Exam Name
  dateSubmitted: Timestamp; // Firestore Timestamp
  studentCount: number;
  averageScore: number | null;
  status: string; // Teacher-facing status from AI check: "Pending Review (Anomaly Detected)" | "Accepted"
  submittedMarks: Array<{ studentId: string; score: number }>; // studentId is studentIdNumber
  anomalyExplanations: Array<AnomalyExplanation>; // Anomaly explanations if any from AI
  // D.O.S. specific fields
  dosStatus: 'Pending' | 'Approved' | 'Rejected';
  dosRejectReason?: string;
  dosLastReviewedBy?: string; // User ID of D.O.S. (future use)
  dosLastReviewedAt?: Timestamp; // Firestore Timestamp
  dosEdited?: boolean; // Flag if D.O.S. edited the marks
  dosLastEditedAt?: Timestamp; // Firestore Timestamp
}

// For Teacher's View of Submission History
export interface SubmissionHistoryDisplayItem {
  id: string; // Firestore document ID of the submission
  assessmentName: string; // Human-readable name from MarkSubmissionFirestoreRecord.assessmentName
  dateSubmitted: string; // ISO string for display
  studentCount: number;
  averageScore: number | null;
  status: string; // Combined/derived status for display to teacher reflecting D.O.S. review
  dosStatus: MarkSubmissionFirestoreRecord['dosStatus']; // Raw D.O.S. status
  dosRejectReason?: string;
}

// For D.O.S. Marks Review Page
export type MarksForReviewEntry = GradeEntry & { studentName: string };
export interface MarksForReviewPayload {
    submissionId: string | null; // Firestore document ID of the submission
    assessmentName: string | null; // Human-readable name from MarkSubmissionFirestoreRecord.assessmentName
    marks: MarksForReviewEntry[];
    dosStatus?: MarkSubmissionFirestoreRecord['dosStatus'];
    dosRejectReason?: string;
    teacherId?: string;
    teacherName?: string;
}


// --- Data Analysis ---

export interface SummaryStatistics {
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  highest: number;
  lowest: number;
  range: number;
  count: number;
}

export interface GradeDistributionItem {
  grade: string;
  count: number;
}

export interface ScoreFrequencyItem {
  range: string; // e.g., "81-90"
  count: number;
}

export interface AssessmentAnalysisData {
  submissionId: string | null;
  assessmentName: string;
  summary: SummaryStatistics;
  gradeDistribution: GradeDistributionItem[];
  scoreFrequency: ScoreFrequencyItem[];
  marks: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    score: number;
    grade: string;
  }>;
}

// --- Teacher Class Management & Attendance Types ---
export interface StudentClassMark {
  studentId: string; // The student's document ID
  studentIdNumber: string;
  studentName: string;
  score: number | null;
  grade: string;
}

export interface ClassAssessment {
    examId: string;
    examName: string;
    subjectId: string;
    subjectName: string;
    maxMarks: number;
    marks: StudentClassMark[];
    summary: { // Simplified analysis
        average: number;
        highest: number;
        lowest: number;
        submissionCount: number;
    };
    gradeDistribution: Array<{ grade: string, count: number }>;
}

export interface ClassManagementStudent {
  id: string; // student document id
  studentIdNumber: string;
  firstName: string;
  lastName: string;
}

export interface StudentAttendanceInput {
    teacherId: string;
    classId: string;
    date: string; // YYYY-MM-DD
    records: Array<{
        studentId: string; // Student document ID
        status: 'present' | 'absent' | 'late';
    }>;
}

export interface DailyAttendanceRecord {
    classId: string;
    teacherId: string;
    date: string; // YYYY-MM-DD
    records: Array<{
        studentId: string; // Student document ID
        status: 'present' | 'absent' | 'late';
    }>;
    lastUpdatedAt: Timestamp;
}

export interface AttendanceData {
  present: number;
  absent: number;
  late: number;
  presentDetails: Array<{ id: string; name: string }>;
  absentDetails: Array<{ id: string; name: string }>;
  lateDetails: Array<{ id: string; name: string }>;
}


export interface ClassTeacherData {
  classInfo: ClassInfo;
  students: ClassManagementStudent[];
  assessments: ClassAssessment[];
  attendance: AttendanceData | null;
}

export interface AttendanceHistoryData {
    date: string;
    studentId: string;
    studentName: string;
    status: 'present' | 'absent' | 'late';
}

export interface WebsiteContent {
  logoUrl: string;
  atAGlance: Array<{
    label: string;
    value: string;
  }>;
  programHighlights: Array<{
    title: string;
    description: string;
    imageUrls: string[];
  }>;
  community: {
    title: string;
    description: string;
    imageUrls: string[];
  };
  news: Array<{
    title: string;
    date: string;
    description: string;
    imageUrls: string[];
  }>;
  inquireSection: {
    buttonText: string;
    buttonLink: string;
    slides: Array<{
      title: string;
      subtitle: string;
      imageUrls: string[];
    }>;
  };
  academicsPage: {
    title: string;
    description: string;
    programs: Array<{
      name: string;
      description: string;
      imageUrls: string[];
    }>;
  };
  admissionsPage: {
    title: string;
    description: string;
    process: Array<{
      step: string;
      title: string;
      description: string;
    }>;
    formUrl: string;
  };
  contactPage: {
    title: string;
    address: string;
    phone: string;
    email: string;
    mapImageUrl: string;
  };
  studentLifePage: {
    title: string;
    description: string;
    features: Array<{
      title: string;
      description: string;
      imageUrls: string[];
    }>;
  };
}
