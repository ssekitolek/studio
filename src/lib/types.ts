
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
    id: string;
    examId: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    maxMarks: number;
    submissionDeadline: string;
}

export interface Mark {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number | null;
  submittedAt?: string;
  lastUpdatedAt?: string;
  comments?: string;
}

export interface GradeEntry {
  studentId: string;
  grade: number;
}

export interface AnomalyExplanation {
  studentId: string;
  explanation: string;
}

export interface GeneralSettings {
    defaultGradingScale: Array<GradingScaleItem>;
    currentTermId?: string;
    markSubmissionTimeZone: string;
    globalMarksSubmissionDeadline?: string;
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
  nextDeadlineInfo: string; // Formatted string like "Exam: YYYY-MM-DD" or "Term End: YYYY-MM-DD"
}

export interface TeacherNotification {
  id: string; // Unique ID for the notification (e.g., 'dos_announcement', 'deadline_reminder_examId_classId_subjectId')
  message: string;
  type: 'deadline' | 'info' | 'warning'; // To style the notification
  link?: string; // Optional link for more details
}

export interface TeacherStats {
  assignedClassesCount: number;
  subjectsTaughtCount: number;
  recentSubmissionsCount: number; // e.g., submissions in the last 7 days
}

export interface TeacherDashboardData {
  assignments: TeacherDashboardAssignment[];
  notifications: TeacherNotification[];
  teacherName?: string; // Name of the logged-in teacher
  resourcesText?: string; // Text from D.O.S. General Settings
  stats: TeacherStats;
}

// For Firestore structure of markSubmissions
export interface MarkSubmissionFirestoreRecord {
  teacherId: string;
  assessmentId: string; // examId_classId_subjectId
  assessmentName: string; // Class Name - Subject Name - Exam Name
  dateSubmitted: import("firebase/firestore").Timestamp; // Firestore Timestamp
  studentCount: number;
  averageScore: number | null;
  status: string; // Teacher-facing status: "Pending Review (Anomaly Detected)" | "Accepted"
  submittedMarks: Array<{ studentId: string; score: number }>;
  anomalyExplanations: Array<AnomalyExplanation>;
  // D.O.S. specific fields
  dosStatus: 'Pending' | 'Approved' | 'Rejected'; // D.O.S. workflow status
  dosRejectReason?: string;
  dosLastReviewedBy?: string; // Optional: User ID of D.O.S. (future use)
  dosLastReviewedAt?: import("firebase/firestore").Timestamp; // Optional: Timestamp of D.O.S. review
  dosEdited?: boolean; // Flag if D.O.S. edited the marks
  dosLastEditedAt?: import("firebase/firestore").Timestamp; // Timestamp of D.O.S. edit
}

// For Teacher's View of Submission History
export interface SubmissionHistoryDisplayItem {
  id: string; // Firestore document ID of the submission
  assessmentName: string;
  dateSubmitted: string; // ISO string
  studentCount: number;
  averageScore: number | null;
  status: string; // Combined/derived status for display to teacher
  dosStatus: 'Pending' | 'Approved' | 'Rejected'; // Actual D.O.S. status
  dosRejectReason?: string;
}

