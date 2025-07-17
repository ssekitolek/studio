
"use client";

import React from 'react';
import type { ReportCardData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { isValidUrl } from '@/lib/utils';

interface OLevelReportCardProps {
  data: ReportCardData;
}

export function OLevelReportCard({ data }: OLevelReportCardProps) {
  const { schoolDetails, student, term, class: studentClass, results, summary, comments, nextTermBegins } = data;

  return (
    <div className="bg-white text-black p-4 md:p-8 font-sans border-2 border-black max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        {isValidUrl(schoolDetails.logoUrl) && (
             <Image 
                src={schoolDetails.logoUrl} 
                alt={`${schoolDetails.name} Logo`} 
                width={80} 
                height={80} 
                className="mx-auto"
                data-ai-hint="school logo"
            />
        )}
        <h1 className="text-2xl font-bold uppercase mt-2">{schoolDetails.name}</h1>
        <p className="text-sm">{schoolDetails.address}, {schoolDetails.location}</p>
        <p className="text-sm">Email: {schoolDetails.email} | Tel: {schoolDetails.phone}</p>
        <div className="w-full h-px bg-black my-2"></div>
        <h2 className="text-xl font-semibold">END OF TERM REPORT</h2>
      </div>

      {/* Student Details */}
      <div className="grid grid-cols-12 gap-2 text-sm mb-4">
        <div className="col-span-10">
            <div className="grid grid-cols-4 gap-x-4 gap-y-1">
                <div className="font-bold">NAME:</div>
                <div className="col-span-3">{student.firstName} {student.lastName}</div>
                
                <div className="font-bold">INDEX No.:</div>
                <div className="col-span-3">{student.studentIdNumber}</div>

                 <div className="font-bold">YEAR:</div>
                <div>{term.year}</div>
            </div>
        </div>
        <div className="col-span-2">
            <div className="grid grid-cols-1 gap-y-1">
                <div><span className="font-bold">CLASS:</span> {studentClass.name} {student.stream || ''}</div>
                <div><span className="font-bold">TERM:</span> {term.name}</div>
                <div><span className="font-bold">GENDER:</span> {student.gender || 'N/A'}</div>
            </div>
        </div>
      </div>

      {/* Results Table */}
      <table className="w-full border-collapse border border-black text-sm">
        <thead>
          <tr className="bg-gray-200 font-bold">
            <th className="border border-black p-1">SUBJECT</th>
            <th className="border border-black p-1">BOT(%)</th>
            <th className="border border-black p-1">MOT(%)</th>
            <th className="border border-black p-1">EOT(%)</th>
            <th className="border border-black p-1">FINAL(100)</th>
            <th className="border border-black p-1">GRADE</th>
            <th className="border border-black p-1 w-[200px]">COMMENT</th>
            <th className="border border-black p-1">INITIALS</th>
          </tr>
        </thead>
        <tbody>
          {results.map((res, index) => (
            <tr key={index}>
              <td className="border border-black p-1 font-semibold">{res.subjectName}</td>
              <td className="border border-black p-1 text-center">{res.botScore?.toFixed(1) ?? '-'}</td>
              <td className="border border-black p-1 text-center">{res.motScore?.toFixed(1) ?? '-'}</td>
              <td className="border border-black p-1 text-center">{res.eotScore?.toFixed(1) ?? '-'}</td>
              <td className="border border-black p-1 text-center font-bold">{res.finalScore.toFixed(1)}</td>
              <td className="border border-black p-1 text-center font-bold">{res.grade}</td>
              <td className="border border-black p-1 text-xs">{res.comment}</td>
              <td className="border border-black p-1 text-center">{res.teacherInitials}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-4 flex justify-around font-bold text-sm">
        <p>TOTAL MARKS: {summary.totalMarks.toFixed(1)}</p>
        <p>AVERAGE: {summary.average.toFixed(2)}</p>
        <p>GRADE: {summary.overallGrade}</p>
      </div>

      {/* Comments */}
      <div className="mt-4 text-sm">
        <div className="border border-black p-2 h-[80px]">
            <p><span className="font-bold">Class Teacher's Comment:</span> {comments.classTeacher}</p>
            <p className="mt-4"><span className="font-bold">Head Teacher's Comment:</span> {comments.headTeacher}</p>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-4 text-center text-xs">
        <p>This report is an official document of {schoolDetails.name}.</p>
        <p className="font-bold">Next term begins on: {nextTermBegins}.</p>
      </div>
    </div>
  );
}
