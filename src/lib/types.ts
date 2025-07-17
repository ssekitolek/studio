


import type { Timestamp } from "firebase/firestore";

export interface Teacher {
  id: string; // This is the Firestore document ID, which should be the same as the UID
  uid: string; // This is the Firebase Auth User ID
  name: string;
  email: string;
  role: 'admin' | 'dos' | 'teacher';
  password?: string; // This should only be used for creation/update, not stored in Firestore
  subjectsAssigned: Array<{ subjectId: string; classIds: string[] }>;
}

export interface Student {
  id: string;
  studentIdNumber: string;
  firstName: string;
  lastName: string;
  classId: string;
  stream?: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
}

export interface ClassInfo {
  id: string;
  name: string;
  level: string;
  streams?: string[];
  classTeacherId?: string; // Firestore document ID of the teacher
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
  // An exam can be for a specific subject, but not necessarily a specific class or teacher
  subjectId?: string; // Firestore document ID of the subject
  classId?: string; // Optional: To narrow down exam to one class
  teacherId?: string; // Optional: To narrow down exam to one teacher
  stream?: string;
  marksSubmissionDeadline?: string; // Should be ISO string date e.g., "YYYY-MM-DD"
  gradingPolicyId?: string; // The ID of the assigned GradingPolicy
}

// This type is used for internal representation, e.g., when constructing dropdowns.
// The actual submission will use the composite assessmentId.
export interface AssessmentContext {
    examId: string; // Firestore document ID for the exam
    classId: string; // Firestore document ID for the class
    subjectId: string; // Firestore document ID for the subject
    teacherId: string; // Firebase Auth UID of the teacher
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
  grade: number | null;
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
    dosWelcomeText?: string;
    dosWelcomeImageUrl?: string;
    dosGlobalAnnouncementText?: string;
    dosGlobalAnnouncementType?: 'info' | 'warning';
    teacherDashboardResourcesText?: string;
    teacherDashboardResourcesImageUrl?: string;
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
  id: string; // Composite ID for a specific task, e.g., examId_classId
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
  resourcesImageUrl?: string;
  stats: TeacherStats;
}

// For Firestore structure of markSubmissions
export interface MarkSubmissionFirestoreRecord {
  teacherId: string; // Firebase Auth UID of the teacher
  assessmentId: string; // Composite key: examDocumentId_classDocumentId_subjectDocumentId
  assessmentName: string; // Derived human-readable: Class Name - Subject Name - Exam Name
  dateSubmitted: Timestamp; // Firestore Timestamp
  studentCount: number;
  averageScore: number | null;
  status: string; // Teacher-facing status from AI check: "Pending Review (Anomaly Detected)" | "Accepted"
  submittedMarks: Array<{ studentId: string; score: number | null }>; // studentId is studentIdNumber
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
    teacherId?: string; // Firebase Auth UID
    teacherName?: string;
    // New fields to hold the resolved objects
    exam?: Exam | null;
    subject?: Subject | null;
    class?: ClassInfo | null;
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
    score: number | null;
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
  stream?: string;
}

export interface StudentAttendanceInput {
    teacherId: string; // Firebase Auth UID
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

export interface StudentDetail {
    id: string;
    name: string;
}

export interface DOSAttendanceSummary {
    present: number;
    absent: number;
    late: number;
    totalStudents: number;
    totalRecords: number;
    teacherName: string;
    lastUpdatedAt: string | null;
    presentDetails: StudentDetail[];
    absentDetails: StudentDetail[];
    lateDetails: StudentDetail[];
}


// --- Report Card ---
export interface ReportCardData {
  schoolDetails: {
    name: string;
    address: string;
    location: string;
    phone: string;
    email: string;
    logoUrl: string;
    theme: string;
  };
  student: Student;
  term: Term;
  class: ClassInfo;
  results: Array<{
    subjectName: string;
    topics: Array<{ name: string; aoiScore: number | null }>;
    aoiTotal: number;
    eotScore: number;
    finalScore: number;
    grade: string;
    descriptor: string;
    teacherInitials: string;
  }>;
  summary: {
    average: number;
    gradeScale: GradingScaleItem[];
  };
  comments: {
    classTeacher: string;
    headTeacher: string;
  };
  nextTerm: {
    begins: string;
    ends: string;
    fees: string;
  };
}


// --- Website Content Management ---

export interface SimplePageContent {
  title: string;
  description: string;
  heroImageUrl: string;
  contentTitle: string;
  contentBody: string;
}

export interface MissionVisionPageContent {
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  missionTitle: string;
  missionText: string;
  missionImageUrl: string;
  visionTitle: string;
  visionText: string;
  visionImageUrl: string;
  coreValuesTitle: string;
  coreValuesDescription: string;
  coreValues: Array<{
    title: string;
    description: string;
  }>;
}


export interface WebsiteContent {
  logoUrl: string;
  heroSlideshowSection: {
    buttonText: string;
    buttonLink: string;
    slides: Array<{
      title: string;
      subtitle: string;
      imageUrls: string[];
    }>;
  };
  whyUsSection: {
    heading: string;
    description: string;
    points: Array<{
      icon: string;
      title: string;
      description: string;
      imageUrl: string;
    }>;
  };
  signatureProgramsSection: {
    heading: string;
    programs: Array<{
        title: string;
        description: string;
        imageUrls: string[];
    }>;
  };
  newsSection: {
    heading: string;
    posts: Array<{
        title: string;
        date: string;
        imageUrls: string[];
    }>;
  };
  alumniSpotlightSection: {
    heading: string;
    description: string;
    spotlights: Array<{
      name: string;
      graduationYear: string;
      quote: string;
      imageUrl: string;
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
  missionVisionPage: MissionVisionPageContent;
  housesPage: {
    title: string;
    description: string;
    heroImageUrl: string;
    houses: Array<{
      name: string;
      description: string;
      imageUrls: string[];
    }>;
  };
  alumniPage: SimplePageContent;
  campusPage: SimplePageContent;
  clubsPage: SimplePageContent;
  collegeCounselingPage: SimplePageContent;
  employmentPage: SimplePageContent;
  facultyPage: SimplePageContent;
  historyPage: SimplePageContent;
  parentsPage: SimplePageContent;
  tuitionPage: SimplePageContent;
  visitPage: SimplePageContent;
}
