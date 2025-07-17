
"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Loader2, Search, AlertTriangle, Download } from "lucide-react";
import { getClasses, getStudentsForClass, getTerms, getReportCardData } from "@/lib/actions/dos-actions";
import type { ClassInfo, Student, Term, ReportCardData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { OLevelReportCard } from "@/components/reports/OLevelReportCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { isValidUrl } from "@/lib/utils";

export default function GenerateReportCardPage() {
  const { toast } = useToast();
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isGenerating, startGenerationTransition] = useTransition();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  
  const [reportData, setReportData] = useState<ReportCardData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoadingInitialData(true);
      try {
        const [classesData, termsData] = await Promise.all([
          getClasses(),
          getTerms(),
        ]);
        setClasses(classesData);
        setTerms(termsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (selectedClass) {
      async function fetchStudents() {
        setStudents([]);
        setSelectedStudent("");
        const studentsData = await getStudentsForClass(selectedClass);
        setStudents(studentsData);
      }
      fetchStudents();
    }
  }, [selectedClass]);

  const handleGenerateReport = () => {
    if (!selectedClass || !selectedStudent || !selectedTerm) {
      toast({ title: "Selection Missing", description: "Please select a class, student, and term.", variant: "destructive" });
      return;
    }
    setReportData(null);
    startGenerationTransition(async () => {
      const result = await getReportCardData(selectedStudent, selectedTerm);
      if (result.success && result.data) {
        setReportData(result.data);
         if (result.data.results.length === 0) {
          toast({ title: "No Data", description: "No approved marks found for this student in the selected term.", variant: "default" });
        }
      } else {
        toast({ title: "Generation Failed", description: result.message, variant: "destructive" });
        setReportData(null);
      }
    });
  };

  const handleDownloadPdf = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    
    // Header
    if (isValidUrl(reportData.schoolDetails.logoUrl)) {
      try {
         doc.addImage(reportData.schoolDetails.logoUrl, 'PNG', margin, margin, 20, 20);
      } catch(e) {
         console.error("Error adding logo image to PDF. Using placeholder text. Image URL:", reportData.schoolDetails.logoUrl, e);
      }
    }
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(reportData.schoolDetails.name, pageWidth / 2, margin + 8, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${reportData.schoolDetails.address}, ${reportData.schoolDetails.location}`, pageWidth / 2, margin + 14, { align: 'center' });
    doc.text(`Email: ${reportData.schoolDetails.email} | Tel: ${reportData.schoolDetails.phone}`, pageWidth / 2, margin + 19, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 25, pageWidth - margin, margin + 25);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text("END OF TERM REPORT", pageWidth / 2, margin + 32, { align: 'center' });
    
    // Student Details
    const studentDetailsY = margin + 40;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const studentDetails = [
        [`NAME:`, `${reportData.student.firstName} ${reportData.student.lastName}`, `CLASS:`, `${reportData.class.name} ${reportData.student.stream || ''}`.trim()],
        [`INDEX No.:`, `${reportData.student.studentIdNumber}`, `TERM:`, `${reportData.term.name}`],
        [`YEAR:`, `${reportData.term.year}`, `GENDER:`, `${reportData.student.gender || 'N/A'}`]
    ];
    autoTable(doc, {
      body: studentDetails,
      startY: studentDetailsY,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 0.5 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { fontStyle: 'bold' }
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Results Table
    const head = [['SUBJECT', 'AOI(20)', 'EOT(80)', 'FINAL(100)', 'GRADE', 'DESCRIPTOR', 'INITIALS']];
    const body: any[] = [];
    
    reportData.results.forEach(res => {
        body.push([
            { content: res.subjectName, styles: { fontStyle: 'bold' } },
            '', '', '', '', '', ''
        ]);
        res.topics.forEach(topic => {
            body.push([
                `    ${topic.name}`,
                topic.aoiScore?.toFixed(1) ?? '-',
                '', '', '', '', ''
            ]);
        });
        body.push([
            { content: 'TOTALS', styles: { fontStyle: 'bold' } },
            { content: res.aoiTotal.toFixed(1), styles: { fontStyle: 'bold' } },
            { content: res.eotScore.toFixed(1), styles: { fontStyle: 'bold' } },
            { content: res.finalScore.toFixed(1), styles: { fontStyle: 'bold' } },
            { content: res.grade, styles: { fontStyle: 'bold' } },
            res.descriptor,
            res.teacherInitials
        ]);
    });

    autoTable(doc, {
      head: head,
      body: body,
      startY: finalY + 5,
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      didDrawCell: (data) => {
        // Custom styling if needed
      }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Summary Section
    doc.setFontSize(10);
    doc.text(`OVERALL AVERAGE MARK: ${reportData.summary.average.toFixed(2)}`, margin, finalY + 10);
    
    // Comments section
    const commentsY = finalY + 20;
    doc.setDrawColor(0);
    doc.rect(margin, commentsY, pageWidth - (margin * 2), 20); // Smaller box
    doc.setFont(undefined, 'bold');
    doc.text("Class Teacher's Comment:", margin + 2, commentsY + 5);
    doc.text("Head Teacher's Comment:", margin + 2, commentsY + 13);
    doc.setFont(undefined, 'normal');
    doc.text(reportData.comments.classTeacher, margin + 45, commentsY + 5);
    doc.text(reportData.comments.headTeacher, margin + 45, commentsY + 13);
    
    finalY = commentsY + 20;

    // Next term details
    doc.setFontSize(10);
    doc.text(`NEXT TERM BEGINS: ${reportData.nextTerm.begins} AND ENDS: ${reportData.nextTerm.ends}`, margin, finalY + 8);
    doc.text(`NEXT TERM FEES: UGX. ${reportData.nextTerm.fees}`, margin + 130, finalY + 8);
    
    // Note section
    finalY += 15;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text("NOTE", margin, finalY);
    doc.setFont(undefined, 'normal');
    doc.text("1. Under competency-based learning, we do not rank / position learners.", margin, finalY + 4);
    doc.text("2. The 80% score (EOT) is intended to take care of the different levels of achievement separating outstanding performance from very good performance.", margin, finalY + 8);
    doc.text("3. The scores in Formative category (20%) have been generated from Activities of Integration (AOI).", margin, finalY + 12);
    
    // Footer
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setLineHeightFactor(1.5);
    doc.text(`THEME FOR ${reportData.term.year}: "${reportData.schoolDetails.theme}"`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Printed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, footerY + 4, { align: 'center' });


    doc.save(`Report_Card_${reportData.student.firstName}_${reportData.student.lastName}_${reportData.term.name}.pdf`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Report Cards"
        description="Select a student and term to generate and view their report card."
        icon={FileSpreadsheet}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Selection Criteria</CardTitle>
          <CardDescription>Select the class, student, and term to generate the report for.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Class"} /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
            <SelectTrigger><SelectValue placeholder={!selectedClass ? "Select class first" : "Select Student"} /></SelectTrigger>
            <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Term"} /></SelectTrigger>
            <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
           <Button
              onClick={handleGenerateReport}
              disabled={isLoadingInitialData || isGenerating || !selectedClass || !selectedStudent || !selectedTerm}
            >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Generate Report
            </Button>
        </CardContent>
      </Card>
      
      {isGenerating && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Aggregating marks and generating report...</p>
        </div>
      )}

      {reportData && (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl text-primary">Generated Report Preview</CardTitle>
                    <CardDescription>
                       Report for {reportData.student.firstName} {reportData.student.lastName} - {reportData.term.name} {reportData.term.year}
                    </CardDescription>
                </div>
                <Button onClick={handleDownloadPdf} disabled={isGenerating}>
                    <Download className="mr-2 h-4 w-4"/>
                    Download as PDF
                </Button>
            </CardHeader>
            <CardContent>
               <OLevelReportCard data={reportData} />
            </CardContent>
        </Card>
      )}

    </div>
  );
}
