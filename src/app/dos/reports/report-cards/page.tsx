
"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileSpreadsheet, Loader2, Search, AlertTriangle, Download } from "lucide-react";
import { getClasses, getStudentsForClass, getTerms, getReportCardData } from "@/lib/actions/dos-actions";
import type { ClassInfo, Student, Term, ReportCardData, ReportGenerationOptions } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { OLevelReportCard } from "@/components/reports/OLevelReportCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { isValidUrl } from "@/lib/utils";
import { format } from "date-fns";

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
  const [selectedReportType, setSelectedReportType] = useState("'O' LEVEL REPORT");
  
  const [nextTermBegins, setNextTermBegins] = useState<Date | undefined>();
  const [nextTermEnds, setNextTermEnds] = useState<Date | undefined>();
  const [nextTermFees, setNextTermFees] = useState("1,025,500");
  const [schoolTheme, setSchoolTheme] = useState('"Built for greater works." Ephesians 2:10');

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
    if (!selectedClass || !selectedStudent || !selectedTerm || !nextTermBegins || !nextTermEnds || !nextTermFees || !schoolTheme) {
      toast({ title: "Selection Missing", description: "Please fill out all fields before generating the report.", variant: "destructive" });
      return;
    }
    setReportData(null);
    startGenerationTransition(async () => {
      const options: ReportGenerationOptions = {
        nextTerm: {
          begins: format(nextTermBegins, "dd-MMM-yyyy"),
          ends: format(nextTermEnds, "dd-MMM-yyyy"),
          fees: nextTermFees,
        },
        schoolTheme: schoolTheme
      };
      
      const result = await getReportCardData(selectedStudent, selectedTerm, selectedReportType, options);

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

    const doc = new jsPDF('p', 'pt', 'a4');
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    
    // Header
    if (isValidUrl(reportData.schoolDetails.logoUrl)) {
      try {
         // The coordinates and dimensions are in points. 1pt = 1/72 inch
         doc.addImage(reportData.schoolDetails.logoUrl, 'PNG', margin, margin, 50, 50);
      } catch(e) {
         console.error("Error adding logo image to PDF. Using placeholder text. Image URL:", reportData.schoolDetails.logoUrl, e);
      }
    }
    
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(reportData.schoolDetails.name, pageWidth / 2, margin + 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`${reportData.schoolDetails.address}, ${reportData.schoolDetails.location}`, pageWidth / 2, margin + 28, { align: 'center' });
    doc.text(`Email: ${reportData.schoolDetails.email} | Tel: ${reportData.schoolDetails.phone}`, pageWidth / 2, margin + 40, { align: 'center' });
    
    doc.setLineWidth(1);
    doc.line(margin, margin + 50, pageWidth - margin, margin + 50);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(reportData.reportTitle, pageWidth / 2, margin + 65, { align: 'center' });
    
    // Student Details
    const studentDetailsY = margin + 80;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const studentDetails = [
        [`NAME:`, `${reportData.student.firstName} ${reportData.student.lastName}`, `CLASS:`, `${reportData.class.name} ${reportData.student.stream || ''}`.trim()],
        [`STUDENT NO.:`, `${reportData.student.studentIdNumber}`, `TERM:`, `${reportData.term.name}`],
        [`YEAR:`, `${reportData.term.year}`, `GENDER:`, `${reportData.student.gender || 'N/A'}`]
    ];
    autoTable(doc, {
      body: studentDetails,
      startY: studentDetailsY,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 180 },
        2: { fontStyle: 'bold', cellWidth: 60 },
        3: { cellWidth: 'auto' },
      }
    });

    let finalY = (doc as any).lastAutoTable.finalY;

    // Results Table
    const head = [['SUBJECT', 'AOI(20)', 'EOT(80)', 'FINAL(100)', 'GRADE', 'DESCRIPTOR', 'INITIALS']];
    const body: any[] = reportData.results.map(res => [
        { content: res.subjectName, styles: { fontStyle: 'bold' } },
        { content: res.aoiTotal.toFixed(1), styles: { fontStyle: 'bold' } },
        { content: res.eotScore.toFixed(1), styles: { fontStyle: 'bold' } },
        { content: res.finalScore.toFixed(1), styles: { fontStyle: 'bold' } },
        { content: res.grade, styles: { fontStyle: 'bold' } },
        res.descriptor,
        res.teacherInitials
    ]);

    autoTable(doc, {
      head: head,
      body: body,
      startY: finalY + 10,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, fontStyle: 'bold' },
      headStyles: { fillColor: [200, 200, 200], textColor: 0, fontStyle: 'bold', halign: 'center' },
      columnStyles: {
          0: { cellWidth: 90 }, // Subject
          1: { cellWidth: 40, halign: 'center' }, // AOI
          2: { cellWidth: 40, halign: 'center' }, // EOT
          3: { cellWidth: 45, halign: 'center' }, // FINAL
          4: { cellWidth: 40, halign: 'center' }, // GRADE
          5: { cellWidth: 'auto', fontStyle: 'normal' }, // DESCRIPTOR
          6: { cellWidth: 40, halign: 'center' }, // INITIALS
      },
    });

    finalY = (doc as any).lastAutoTable.finalY;

    // Summary Section
    finalY = finalY > pageHeight - 200 ? finalY : pageHeight - 200; // Push to bottom
    doc.setFontSize(10);
    doc.text(`OVERALL AVERAGE SCORES: ${reportData.summary.average.toFixed(2)}`, margin, finalY);
    
    // Comments section
    const commentsY = finalY + 15;
    doc.setDrawColor(0);
    doc.rect(margin, commentsY, pageWidth - (margin * 2), 40);
    doc.setFont(undefined, 'bold');
    doc.text("Class Teacher's Comment:", margin + 5, commentsY + 12);
    doc.text("Head Teacher's Comment:", margin + 5, commentsY + 30);
    doc.setFont(undefined, 'normal');
    doc.text(reportData.comments.classTeacher, margin + 130, commentsY + 12);
    doc.text(reportData.comments.headTeacher, margin + 130, commentsY + 30);
    
    finalY = commentsY + 40;

    // Next term details
    doc.setFontSize(10);
    doc.text(`NEXT TERM BEGINS: ${reportData.nextTerm.begins} AND ENDS: ${reportData.nextTerm.ends}`, margin, finalY + 15);
    doc.text(`NEXT TERM FEES: UGX. ${reportData.nextTerm.fees}`, pageWidth - margin, finalY + 15, { align: 'right' });
    
    // Note section
    finalY += 30;
    doc.setFontSize(8);
    doc.setFont(undefined, 'bold');
    doc.text("NOTE", margin, finalY);
    doc.setFont(undefined, 'normal');
    doc.text("1. Under competency-based learning, we do not rank / position learners.", margin, finalY + 10);
    doc.text("2. The 80% score (EOT) is intended to take care of the different levels of achievement separating outstanding performance from very good performance.", margin, finalY + 20);
    doc.text("3. The scores in Formative category (20%) have been generated from Activities of Integration (AOI).", margin, finalY + 30);
    
    // Footer
    const footerY = pageHeight - 30;
    doc.setFontSize(9);
    doc.setLineHeightFactor(1.5);
    doc.text(`THEME FOR ${reportData.term.year}: ${reportData.schoolDetails.theme}`, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Printed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, footerY + 12, { align: 'center' });


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
          <CardTitle className="font-headline text-xl text-primary">Report Generation</CardTitle>
          <CardDescription>Select the student, term, and options for the report card.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Step 1: Select Student & Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>
          </div>

          <div>
             <h3 className="text-lg font-semibold mb-2">Step 2: Set Report Options</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                   <Label>Report Type</Label>
                   <Select value={selectedReportType} onValueChange={setSelectedReportType} disabled={isLoadingInitialData}>
                    <SelectTrigger><SelectValue placeholder="Select Report Type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="'O' LEVEL REPORT">'O' LEVEL REPORT</SelectItem>
                        <SelectItem value="'A' LEVEL REPORT">'A' LEVEL REPORT</SelectItem>
                    </SelectContent>
                   </Select>
                </div>
                 <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="school-theme">School Theme</Label>
                    <Input id="school-theme" value={schoolTheme} onChange={(e) => setSchoolTheme(e.target.value)} placeholder='e.g., "Knowledge is Power"'/>
                </div>
                <div className="flex flex-col space-y-1.5">
                    <Label>Next Term Begins</Label>
                    <DatePicker date={nextTermBegins} setDate={setNextTermBegins} placeholder="Select start date"/>
                </div>
                 <div className="flex flex-col space-y-1.5">
                    <Label>Next Term Ends</Label>
                    <DatePicker date={nextTermEnds} setDate={setNextTermEnds} placeholder="Select end date"/>
                </div>
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                    <Label htmlFor="next-term-fees">Next Term Fees (UGX)</Label>
                    <Input id="next-term-fees" value={nextTermFees} onChange={(e) => setNextTermFees(e.target.value)} placeholder="e.g., 1,025,500"/>
                </div>
             </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={isLoadingInitialData || isGenerating || !selectedClass || !selectedStudent || !selectedTerm}
              size="lg"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
          </div>
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

