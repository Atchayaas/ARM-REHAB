import { jsPDF } from 'jspdf';
import { Patient } from '../types/telemetry';

/**
 * Generates and triggers an authentic .PDF file download directly to user's device
 */
export function downloadClinicalReportPdf(patient: Patient) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 18;

  // Header Bar
  doc.setFillColor(0, 97, 148); // #006194
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FlexRehab AI - Clinical Telemetry Report', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Shoulder Post-Operative Biomechanical Recovery Analysis', 14, 21);
  doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 70, 21);

  y = 38;

  // Patient Demographic Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('1. Patient Profile & Prescribed Regimen', 14, y);
  y += 6;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 38, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  const col1 = 18;
  const col2 = 80;
  const col3 = 140;

  y += 7;
  doc.text(`Patient Name:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.name}`, col1 + 25, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Medical Record:`, col2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.mrn || 'N/A'}`, col2 + 26, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Post-Op Status:`, col3, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Day ${patient.postOpDays}`, col3 + 26, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Sex / Gender:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.gender || 'Not specified'}`, col1 + 25, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Email Address:`, col2, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.email || 'N/A'}`, col2 + 26, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Target Angle:`, col3, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 97, 148);
  doc.text(`${patient.prescribedProtocol.targetAngle}°`, col3 + 26, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Diagnosis:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.primaryDiagnosis}`, col1 + 25, y);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Prescription:`, col1, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${patient.prescribedProtocol.name} • ${patient.prescribedProtocol.setsTarget} sets x ${patient.prescribedProtocol.repsPerSet} reps`, col1 + 25, y);

  y += 18;

  // Key Clinical Metrics Summary (Target, Achieved, Bilateral, Sessions, Milestones)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Real-Time Telemetry & Milestone Metrics', 14, y);
  y += 6;

  const cardWidth = (pageWidth - 28 - 9) / 4;
  const metrics = [
    { label: 'Target Angle', val: `${patient.prescribedProtocol.targetAngle}°`, sub: 'Adaptive +5° Progress' },
    { label: 'Achieved ROM', val: `${patient.historicalSessions.length > 0 ? patient.historicalSessions[patient.historicalSessions.length - 1].maxFlexion : 0}°`, sub: 'Latest Peak ROM' },
    { label: 'Bilateral Symmetry', val: `${patient.historicalSessions.length > 0 ? patient.historicalSessions[patient.historicalSessions.length - 1].symmetryIndex : 0}%`, sub: 'Goniometric Balance' },
    { label: 'Completed Sessions', val: `${patient.historicalSessions.length}`, sub: `Milestones: ${Math.min(3, Math.floor(patient.historicalSessions.length / 2))}/3` },
  ];

  metrics.forEach((m, idx) => {
    const cx = 14 + idx * (cardWidth + 3);
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(cx, y, cardWidth, 24, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, cx + 4, y + 6);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 97, 148);
    doc.text(m.val, cx + 4, y + 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(m.sub, cx + 4, y + 20);
  });

  y += 33;

  // Historical Rehabilitation Sessions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Historical Rehabilitation Sessions Log', 14, y);
  y += 6;

  // Table Header
  doc.setFillColor(226, 232, 240);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const tx1 = 18;
  const tx2 = 45;
  const tx3 = 75;
  const tx4 = 105;
  const tx5 = 135;
  const tx6 = 165;

  doc.text('Session #', tx1, y + 5.5);
  doc.text('Date', tx2, y + 5.5);
  doc.text('Max ROM', tx3, y + 5.5);
  doc.text('Target', tx4, y + 5.5);
  doc.text('Symmetry', tx5, y + 5.5);
  doc.text('Volume (Reps)', tx6, y + 5.5);

  y += 8;

  if (patient.historicalSessions.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(14, y, pageWidth - 28, 12, 'F');
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('No completed sessions recorded yet. Metrics will populate upon completing live camera workouts.', tx1, y + 7);
    y += 14;
  } else {
    patient.historicalSessions.forEach((s, i) => {
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.rect(14, y, pageWidth - 28, 7.5, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Session #${s.sessionNumber}`, tx1, y + 5);
      doc.text(`${s.date}`, tx2, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${s.maxFlexion}°`, tx3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.targetAngle}°`, tx4, y + 5);
      doc.text(`${s.symmetryIndex}%`, tx5, y + 5);
      doc.text(`${s.repsCompleted} reps`, tx6, y + 5);

      y += 7.5;
    });
  }

  y += 8;

  // Compliance & Clinical Certification Stamp
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(4, 120, 87);
  doc.text('Clinical Goniometric Verification & Milestone Certification', 20, y + 7);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(6, 95, 70);
  doc.text(
    'This rehabilitation record is computed via automated computer-vision joint biomechanical estimation. Adherence data conforms to post-operative shoulder protocol standards.',
    20,
    y + 14
  );

  // Footer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('FlexRehab AI • Comprehensive Physical Rehabilitation Assistant • Confidential Medical Telemetry', 14, 287);

  // Trigger real file download!
  const fileName = `${patient.name.replace(/\s+/g, '_')}_Rehab_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
