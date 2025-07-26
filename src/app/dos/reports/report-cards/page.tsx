
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

const TARGET_ALL_STUDENTS = "all_students";

export default function GenerateReportCardPage() {
  const { toast } = useToast();
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isGenerating, startGenerationTransition] = useTransition();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTarget, setSelectedTarget] = useState(""); // Can be studentId, stream name, or "all_students"
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedReportType, setSelectedReportType] = useState("'O' LEVEL REPORT");
  
  const [nextTermBegins, setNextTermBegins] = useState<Date | undefined>();
  const [nextTermEnds, setNextTermEnds] = useState<Date | undefined>();
  const [nextTermFees, setNextTermFees] = useState("");
  const [schoolTheme, setSchoolTheme] = useState('"Built for greater works." Ephesians 2:10');

  const [reportData, setReportData] = useState<ReportCardData[] | null>(null);

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
      async function fetchStudentsAndStreams() {
        setStudents([]);
        setAvailableStreams([]);
        setSelectedTarget("");
        
        const selectedClassInfo = classes.find(c => c.id === selectedClass);
        if (selectedClassInfo?.streams) {
            setAvailableStreams(selectedClassInfo.streams);
        }

        const studentsData = await getStudentsForClass(selectedClass);
        setStudents(studentsData);
      }
      fetchStudentsAndStreams();
    }
  }, [selectedClass, classes]);

  const handleGenerateReport = () => {
    if (!selectedClass || !selectedTarget || !selectedTerm) {
      toast({ title: "Selection Missing", description: "Please select a class, target, and term.", variant: "destructive" });
      return;
    }
    setReportData(null);
    startGenerationTransition(async () => {
      const options: ReportGenerationOptions = {
        schoolTheme: schoolTheme || undefined,
        nextTerm: {
          begins: nextTermBegins ? format(nextTermBegins, "dd-MMM-yyyy") : undefined,
          ends: nextTermEnds ? format(nextTermEnds, "dd-MMM-yyyy") : undefined,
          fees: nextTermFees || undefined,
        },
      };

      const result = await getReportCardData(selectedTarget, selectedTerm, selectedReportType, options, selectedClass);

      if (result.success && result.data) {
        setReportData(result.data);
         if (result.data.length === 0) {
          toast({ title: "No Data", description: "No approved marks found for the selected students in this term.", variant: "default" });
        }
      } else {
        toast({ title: "Generation Failed", description: result.message, variant: "destructive" });
        setReportData(null);
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!reportData || reportData.length === 0) return;

    const doc = new jsPDF('p', 'pt', 'a4');
    
    for (const [index, studentReportData] of reportData.entries()) {
        if (index > 0) {
            doc.addPage();
        }
        
        const { schoolDetails, student, term, class: studentClass, results, summary, comments, nextTerm, reportTitle } = studentReportData;
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 40;

        // --- HEADER SECTION ---
        const headerStartY = margin;
        const logoSize = 80;
        const photoSize = 80;
        
        const headerMaxHeight = Math.max(logoSize, photoSize);
        let finalY = headerStartY + headerMaxHeight;

        // School Logo (Left)
        if (isValidUrl(schoolDetails.logoUrl)) {
            try {
                const response = await fetch(schoolDetails.logoUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const dataUrl = await new Promise(resolve => {
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
                doc.addImage(dataUrl as string, 'PNG', margin, headerStartY, logoSize, logoSize);
            } catch(e) {
                console.error("Error adding school logo image to PDF:", e);
            }
        }
        
        // Student Photo (Right)
        if (isValidUrl(student.imageUrl)) {
            try {
                 const response = await fetch(student.imageUrl);
                 const blob = await response.blob();
                 const reader = new FileReader();
                 const dataUrl = await new Promise(resolve => {
                     reader.onload = () => resolve(reader.result);
                     reader.readAsDataURL(blob);
                 });
                doc.addImage(dataUrl as string, 'PNG', pageWidth - margin - photoSize, headerStartY, photoSize, photoSize);
            } catch (e) {
                console.error("Error adding student image to PDF:", e);
                doc.rect(pageWidth - margin - photoSize, headerStartY, photoSize, photoSize);
                doc.text("Photo", pageWidth - margin - (photoSize/2), headerStartY + (photoSize/2), { align: 'center' });
            }
        } else {
             doc.rect(pageWidth - margin - photoSize, headerStartY, photoSize, photoSize);
             doc.text("Photo", pageWidth - margin - (photoSize/2), headerStartY + (photoSize/2), { align: 'center' });
        }

        // School Text Details (Center)
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(schoolDetails.name, pageWidth / 2, headerStartY + 15, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`${schoolDetails.address}, ${schoolDetails.location}`, pageWidth / 2, headerStartY + 28, { align: 'center' });
        doc.text(`Email: ${schoolDetails.email} | Tel: ${schoolDetails.phone}`, pageWidth / 2, headerStartY + 40, { align: 'center' });
        
        // Line Separator and Report Title
        doc.setLineWidth(1);
        doc.line(margin, finalY, pageWidth - margin, finalY);
        finalY += 15;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(reportTitle, pageWidth / 2, finalY, { align: 'center' });
        finalY += 15;

        // --- STUDENT DETAILS ---
        const studentDetailsLeft = [
            [{ content: 'NAME:', styles: { fontStyle: 'bold' } }, `${student.firstName} ${student.lastName}`],
            [{ content: 'STUDENT NO.:', styles: { fontStyle: 'bold' } }, `${student.studentIdNumber}`],
            [{ content: 'CLASS:', styles: { fontStyle: 'bold' } }, `${studentClass.name} ${student.stream || ''}`.trim()]
        ];
        const studentDetailsRight = [
            [{ content: 'TERM:', styles: { fontStyle: 'bold' } }, `${term.name}`],
            [{ content: 'YEAR:', styles: { fontStyle: 'bold' } }, `${term.year}`],
            [{ content: 'GENDER:', styles: { fontStyle: 'bold' } }, `${student.gender || 'N/A'}`]
        ];

        const tableWidth = (pageWidth - (margin * 2) - 10) / 2;

        autoTable(doc, {
          body: studentDetailsLeft,
          startY: finalY,
          theme: 'plain',
          tableWidth: tableWidth,
          styles: { fontSize: 9, cellPadding: 1 },
          columnStyles: { 0: { cellWidth: 80 } }
        });

        autoTable(doc, {
          body: studentDetailsRight,
          startY: finalY,
          theme: 'plain',
          tableWidth: tableWidth,
          styles: { fontSize: 9, cellPadding: 1 },
          columnStyles: { 0: { cellWidth: 50 } },
          margin: { left: margin + tableWidth + 10 }
        });


        finalY = (doc as any).lastAutoTable.finalY;

        // --- RESULTS TABLE ---
        const head = [['SUBJECT', 'AOI(20)', 'EOT(80)', 'FINAL(100)', 'GRADE', 'DESCRIPTOR', 'INITIALS']];
        const body: any[] = results.map(res => [
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
        
        let bottomSectionY = finalY + 15;
        if (bottomSectionY > pageHeight - 200) {
             doc.addPage();
             bottomSectionY = margin;
        }


        // --- SUMMARY SECTION ---
        doc.setFontSize(10);
        doc.text(`OVERALL AVERAGE SCORES: ${summary.average.toFixed(2)}`, margin, bottomSectionY);
        
        // --- Comments section ---
        let commentsY = bottomSectionY + 30; // Increased starting Y for comments
        doc.setFont(undefined, 'bold');
        doc.text("Class Teacher's Comment:", margin, commentsY);
        doc.setDrawColor(0);
        doc.line(margin + 125, commentsY, pageWidth - margin, commentsY);

        commentsY += 30; // Increased space between comment lines
        doc.text("Head Teacher's Comment:", margin, commentsY);
        doc.line(margin + 125, commentsY, pageWidth - margin, commentsY);
        
        finalY = commentsY + 10;

        // Next term details
        if (nextTerm?.begins || nextTerm?.fees) {
            finalY += 15;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            if (nextTerm.begins && nextTerm.ends) {
                doc.text(`NEXT TERM BEGINS: ${nextTerm.begins} AND ENDS: ${nextTerm.ends}`, margin, finalY);
            }
            if (nextTerm.fees) {
                doc.text(`NEXT TERM FEES: UGX. ${nextTerm.fees}`, pageWidth - margin, finalY, { align: 'right' });
            }
        }
        
        // Note section
        finalY += 20;
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
        if (schoolDetails.theme) {
            doc.text(`THEME FOR ${term.year}: ${schoolDetails.theme}`, pageWidth / 2, footerY, { align: 'center' });
        }
        doc.text(`Printed on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, footerY + 12, { align: 'center' });
    }

    const selectedClassInfo = classes.find(c => c.id === selectedClass);
    const fileName = `Report_Cards_${selectedClassInfo?.name || 'Class'}.pdf`;
    doc.save(fileName);
  };
  
  const isBulkSelection = selectedTarget && (selectedTarget === TARGET_ALL_STUDENTS || availableStreams.includes(selectedTarget));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Report Cards"
        description="Select a student, stream, or class and term to generate their report card(s)."
        icon={FileSpreadsheet}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Report Generation</CardTitle>
          <CardDescription>Select the generation target, term, and options for the report card(s).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Step 1: Select Target & Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingInitialData}>
                <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Class"} /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedTarget} onValueChange={setSelectedTarget} disabled={!selectedClass}>
                <SelectTrigger><SelectValue placeholder={!selectedClass ? "Select class first" : "Select Generation Target"} /></SelectTrigger>
                <SelectContent>
                    <SelectItem value={TARGET_ALL_STUDENTS}>All Students in Class</SelectItem>
                    {availableStreams.length > 0 && availableStreams.map(stream => (
                        <SelectItem key={stream} value={stream}>Stream: {stream}</SelectItem>
                    ))}
                    {students.length > 0 && students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                </SelectContent>
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
                    <Label htmlFor="school-theme">School Theme (Optional)</Label>
                    <Input id="school-theme" value={schoolTheme} onChange={(e) => setSchoolTheme(e.target.value)} placeholder='e.g., "Knowledge is Power"'/>
                </div>
                <div className="flex flex-col space-y-1.5">
                    <Label>Next Term Begins (Optional)</Label>
                    <DatePicker date={nextTermBegins} setDate={setNextTermBegins} placeholder="Select start date"/>
                </div>
                 <div className="flex flex-col space-y-1.5">
                    <Label>Next Term Ends (Optional)</Label>
                    <DatePicker date={nextTermEnds} setDate={setNextTermEnds} placeholder="Select end date"/>
                </div>
                <div className="flex flex-col space-y-1.5 md:col-span-2">
                    <Label htmlFor="next-term-fees">Next Term Fees (UGX) (Optional)</Label>
                    <Input id="next-term-fees" value={nextTermFees} onChange={(e) => setNextTermFees(e.target.value)} placeholder="e.g., 1,025,500"/>
                </div>
             </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={isLoadingInitialData || isGenerating || !selectedTarget || !selectedTerm}
              size="lg"
            >
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Generate Report(s)
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {isGenerating && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Aggregating marks and generating reports...</p>
        </div>
      )}

      {reportData && reportData.length > 0 && (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline text-xl text-primary">Generated Report Preview</CardTitle>
                    <CardDescription>
                       {isBulkSelection 
                         ? `${reportData.length} report(s) generated and ready for download.` 
                         : `Report for ${reportData[0].student.firstName} ${reportData[0].student.lastName} - ${reportData[0].term.name} ${reportData[0].term.year}`
                       }
                    </CardDescription>
                </div>
                <Button onClick={handleDownloadPdf} disabled={isGenerating}>
                    <Download className="mr-2 h-4 w-4"/>
                    Download as PDF
                </Button>
            </CardHeader>
            {!isBulkSelection && (
              <CardContent>
                 <OLevelReportCard data={reportData[0]} />
              </CardContent>
            )}
        </Card>
      )}

    </div>
  );
}
