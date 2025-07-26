

"use client";

import React from 'react';
import type { ReportCardData } from '@/lib/types';
import Image from 'next/image';
import { isValidUrl } from '@/lib/utils';

interface OLevelReportCardProps {
  data: ReportCardData;
}

export function OLevelReportCard({ data }: OLevelReportCardProps) {
  const { schoolDetails, student, term, class: studentClass, results, summary, comments, nextTerm, reportTitle } = data;

  return (
    <div className="bg-white text-black p-4 font-sans border-2 border-black max-w-4xl mx-auto text-[9pt] leading-tight">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="w-1/5">
            {isValidUrl(schoolDetails.logoUrl) && (
                <Image 
                    src={schoolDetails.logoUrl} 
                    alt={`${schoolDetails.name} Logo`} 
                    width={80} 
                    height={80} 
                    data-ai-hint="school logo"
                />
            )}
        </div>
        <div className="w-3/5 text-center">
            <h1 className="text-xl font-bold uppercase mt-1">{schoolDetails.name.toUpperCase()}</h1>
            <p className="text-xs">{schoolDetails.address}, {schoolDetails.location}</p>
            <p className="text-xs">Email: {schoolDetails.email} | Tel: {schoolDetails.phone}</p>
        </div>
        <div className="w-1/5 flex justify-end">
             {isValidUrl(student.imageUrl) ? (
                <Image
                    src={student.imageUrl}
                    alt={`${student.firstName} ${student.lastName}`}
                    width={80}
                    height={80}
                    className="object-cover border border-black"
                    data-ai-hint="student portrait"
                />
            ) : (
                <div className="w-[80px] h-[80px] border border-black flex items-center justify-center text-xs text-gray-500">
                    Photo
                </div>
            )}
        </div>
      </div>
      <div className="w-full h-px bg-black my-1"></div>
      <h2 className="text-lg font-semibold text-center">{reportTitle}</h2>

      {/* Student Details */}
       <div className="grid grid-cols-2 gap-x-4 text-[9pt] my-2">
         <div>
            <div className="grid grid-cols-2">
                <div className="font-bold">NAME:</div>
                <div>{student.firstName} {student.lastName}</div>
                <div className="font-bold">STUDENT NO.:</div>
                <div>{student.studentIdNumber}</div>
                 <div className="font-bold">CLASS:</div>
                <div>{studentClass.name} {student.stream || ''}</div>
            </div>
         </div>
         <div>
             <div className="grid grid-cols-2">
                <div className="font-bold">TERM:</div>
                <div>{term.name}</div>
                 <div className="font-bold">YEAR:</div>
                <div>{term.year}</div>
                <div className="font-bold">GENDER:</div>
                <div>{student.gender || 'N/A'}</div>
             </div>
         </div>
      </div>


      {/* Results Table */}
      <table className="w-full border-collapse border border-black text-[8pt]">
        <thead className="text-[7.5pt]">
          <tr className="bg-gray-200 font-bold">
            <th className="border border-black p-1 w-[20%]">SUBJECT</th>
            <th className="border border-black p-1 w-[8%]">AOI(20)</th>
            <th className="border border-black p-1 w-[8%]">EOT(80)</th>
            <th className="border border-black p-1 w-[8%]">FINAL(100)</th>
            <th className="border border-black p-1 w-[7%]">GRADE</th>
            <th className="border border-black p-1 w-[42%]">DESCRIPTOR</th>
            <th className="border border-black p-1 w-[7%]">INITIALS</th>
          </tr>
        </thead>
        <tbody>
          {results.map((res, index) => (
            <React.Fragment key={index}>
              <tr className='bg-gray-100'>
                <td className="border border-black p-1 font-bold">{res.subjectName}</td>
                <td className="border border-black p-1 text-center font-bold">{res.aoiTotal.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{res.eotScore.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{res.finalScore.toFixed(1)}</td>
                <td className="border border-black p-1 text-center font-bold">{res.grade}</td>
                <td className="border border-black p-1">{res.descriptor}</td>
                <td className="border border-black p-1 text-center">{res.teacherInitials}</td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-2 text-[9pt]">
        <span className="font-bold">OVERALL AVERAGE SCORES: {summary.average.toFixed(2)}</span>
      </div>

      {/* Comments */}
      <div className="mt-4 text-[9pt] space-y-8">
        <div className="grid grid-cols-12 items-center">
            <div className="col-span-3 font-bold">Class Teacher's Comment:</div>
            <div className="col-span-9 border-b border-black border-dotted h-4"></div>
        </div>
        <div className="grid grid-cols-12 items-center">
            <div className="col-span-3 font-bold">Head Teacher's Comment:</div>
            <div className="col-span-9 border-b border-black border-dotted h-4"></div>
        </div>
      </div>
      
       {/* Next term */}
       <div className="mt-2 text-[9pt] flex justify-between">
            <div>
                <span className="font-bold">NEXT TERM BEGINS:</span> {nextTerm?.begins || ''} {nextTerm?.ends && <><span className="font-bold">AND ENDS:</span> {nextTerm.ends}</>}
            </div>
            <div>
                <span className="font-bold">NEXT TERM FEES:</span> UGX. {nextTerm?.fees || ''}
            </div>
        </div>

      {/* Note & Grade Descriptor */}
      <div className="grid grid-cols-12 mt-2 gap-x-4">
        <div className="col-span-8 text-[7.5pt]">
            <p className="font-bold">NOTE</p>
            <p>1. Under competency-based learning, we do not rank / position learners.</p>
            <p>2. The 80% score (EOT) is intended to take care of the different levels of achievement separating outstanding performance from very good performance.</p>
            <p>3. The scores in Formative category (20%) have been generated from Activities of Integration (AOI).</p>
        </div>
        <div className="col-span-4">
            <p className="font-bold text-[8pt]">GRADE DESCRIPTOR</p>
            <table className="w-full border-collapse border border-black text-[8pt]">
                <thead className='bg-gray-200'>
                    <tr>
                        <td className='border border-black p-px text-center font-bold'>GRADE</td>
                        {summary.gradeScale.map(item => <td key={item.grade} className='border border-black p-px text-center font-bold'>{item.grade}</td>)}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className='border border-black p-px text-center font-bold'>SCORE RANGE</td>
                        {summary.gradeScale.map(item => <td key={item.grade} className='border border-black p-px text-center'>{item.minScore}-{item.maxScore}</td>)}
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-2 text-center text-[8pt]">
        <p className='font-bold'>THEME FOR {term.year}: {schoolDetails.theme || ''}</p>
        <p>Printed on {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
      </div>
    </div>
  );
}
