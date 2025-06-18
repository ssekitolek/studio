
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
  subjects: Subject[];
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
  startDate: string;
  endDate: string;
}

export interface Exam {
  id: string;
  name: string;
  termId: string;
  examDate?: string;
  maxMarks: number;
  description?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
  marksSubmissionDeadline?: string;
}

export interface Assessment {
    id: string; // Composite ID: examId_classId_subjectId
    examId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    maxMarks: number;
    submissionDeadline: string;
}

export interface Mark {
  id: string;
  assessmentId: string; // Composite ID: examId_classId_subjectId
  studentId: string; // Student's official ID number
  score: number | null;
  submittedAt?: string; // ISO string
  lastUpdatedAt?: string; // ISO string
  comments?: string;
}

export interface GradeEntry {
  studentId: string; // Student's official ID number
  grade: number;
}

export interface AnomalyExplanation {
  studentId: string; // Student's official ID number
  explanation: string;
}

export interface GeneralSettings {
    defaultGradingScale: Array<GradingScaleItem>;
    currentTermId?: string;
    markSubmissionTimeZone: string;
    globalMarksSubmissionDeadline?: string; // ISO string date
    dosGlobalAnnouncementText?: string;
    dosGlobalAnnouncementType?: 'info' | 'warning';
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

export interface TeacherDashboardAssignment {
  id: string; // Composite ID: examId_classId_subjectId
  className: string;
  subjectName: string;
  examName: string;
  nextDeadlineInfo: string;
}

export interface TeacherNotification {
  id: string;
  message: string;
  type: 'deadline' | 'info' | 'warning';
  link?: string;
}

export interface TeacherStats {
  assignedClassesCount: number;
  subjectsTaughtCount: number;
  recentSubmissionsCount: number;
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
  dateSubmitted: import("firebase/firestore").Timestamp;
  studentCount: number;
  averageScore: number | null;
  status: string; // Teacher-facing status from AI check: "Pending Review (Anomaly Detected)" | "Accepted"
  submittedMarks: Array<{ studentId: string; score: number }>; // studentId is studentIdNumber
  anomalyExplanations: Array<AnomalyExplanation>; // Anomaly explanations if any from AI
  // D.O.S. specific fields
  dosStatus: 'Pending' | 'Approved' | 'Rejected';
  dosRejectReason?: string;
  dosLastReviewedBy?: string; // User ID of D.O.S.
  dosLastReviewedAt?: import("firebase/firestore").Timestamp;
  dosEdited?: boolean; // Flag if D.O.S. edited the marks
  dosLastEditedAt?: import("firebase/firestore").Timestamp;
}

// For Teacher's View of Submission History
export interface SubmissionHistoryDisplayItem {
  id: string; // Firestore document ID of the submission
  assessmentName: string; // Human-readable name
  dateSubmitted: string; // ISO string
  studentCount: number;
  averageScore: number | null;
  status: string; // Combined/derived status for display to teacher reflecting D.O.S. review
  dosStatus: 'Pending' | 'Approved' | 'Rejected';
  dosRejectReason?: string;
}
