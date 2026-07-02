import nodemailer from 'nodemailer';
import { generateEmailBody } from './nvidiaService.js';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') : '',
  },
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendEmail(to, subject, bodyText) {
  const mailOptions = {
    from: `"PreciseHire Recruitment" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background-color: #2563EB; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">PreciseHire</h1>
        </div>
        <div style="padding: 40px; line-height: 1.6; color: #111827; font-size: 16px;">
          ${bodyText.replace(/\n/g, '<br>')}
        </div>
        <div style="background-color: #f9fafb; color: #6b7280; padding: 25px; text-align: center; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px 0;">This is an automated message from PreciseHire AI Recruitment Platform.</p>
          &copy; 2024 PreciseHire. All rights reserved.
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP] Email sent to ${to}: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error(`[SMTP] Error sending to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

function isMockEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const lower = email.toLowerCase().trim();
  return lower.endsWith('@example.com') || 
         lower.includes('test') || 
         lower.endsWith('.local') || 
         lower.endsWith('.example');
}

export async function sendInterviewInvites(candidates, details) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const candidate of candidates) {
    try {
      if (isMockEmail(candidate.email)) {
        console.log(`[SMTP] Mock sending interview invite to ${candidate.email}`);
        results.sent++;
        continue;
      }
      const body = await generateEmailBody('interview', {
        candidateName: candidate.name,
        jobTitle: details.jobTitle,
        date: details.date,
        time: details.time,
        meetLink: details.meetLink
      });
      const res = await sendEmail(candidate.email, `Interview Invitation: ${details.jobTitle} - PreciseHire`, body);
      if (res.success) results.sent++;
      else throw new Error(res.error);
      
      await sleep(1100); // Rate limit protection
    } catch (e) {
      results.failed++;
      results.errors.push({ candidate: candidate.email, error: e.message });
    }
  }
  return results;
}

export async function sendAssessmentLinks(candidates, details) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const candidate of candidates) {
    try {
      if (isMockEmail(candidate.email)) {
        console.log(`[SMTP] Mock sending assessment link to ${candidate.email}`);
        results.sent++;
        continue;
      }
      const body = await generateEmailBody('assessment', {
        candidateName: candidate.name,
        jobTitle: details.jobTitle,
        assessmentUrl: details.assessmentUrl,
        deadline: details.deadline
      });
      const res = await sendEmail(candidate.email, `Assessment for ${details.jobTitle} - PreciseHire`, body);
      if (res.success) results.sent++;
      else throw new Error(res.error);
      
      await sleep(1100);
    } catch (e) {
      results.failed++;
      results.errors.push({ candidate: candidate.email, error: e.message });
    }
  }
  return results;
}

export async function sendOfferLetters(candidates, details) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const candidate of candidates) {
    try {
      if (isMockEmail(candidate.email)) {
        console.log(`[SMTP] Mock sending offer letter to ${candidate.email}`);
        results.sent++;
        continue;
      }
      const body = await generateEmailBody('offer', {
        candidateName: candidate.name,
        jobTitle: details.jobTitle,
        joiningDate: details.joiningDate
      });
      const res = await sendEmail(candidate.email, `Job Offer: ${details.jobTitle} - PreciseHire`, body);
      if (res.success) results.sent++;
      else throw new Error(res.error);
      
      await sleep(1100);
    } catch (e) {
      results.failed++;
      results.errors.push({ candidate: candidate.email, error: e.message });
    }
  }
  return results;
}

export async function sendRoundClearance(candidates, details) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const candidate of candidates) {
    try {
      if (isMockEmail(candidate.email)) {
        console.log(`[SMTP] Mock sending round clearance to ${candidate.email}`);
        results.sent++;
        continue;
      }
      const body = `Dear ${candidate.name},\n\nCongratulations! You have successfully cleared the ${details.currentRound} for the ${details.jobTitle} position at PreciseHire.\n\nWe will be in touch shortly regarding the next steps of the process.\n\nBest regards,\nPreciseHire Recruitment Team`;
      const res = await sendEmail(candidate.email, `Round Cleared: ${details.jobTitle} - PreciseHire`, body);
      if (res.success) results.sent++;
      else throw new Error(res.error);
      
      await sleep(1100);
    } catch (e) {
      results.failed++;
      results.errors.push({ candidate: candidate.email, error: e.message });
    }
  }
  return results;
}

export async function sendRejectionEmail(candidates, details) {
  const results = { sent: 0, failed: 0, errors: [] };
  for (const candidate of candidates) {
    try {
      if (isMockEmail(candidate.email)) {
        console.log(`[SMTP] Mock sending rejection email to ${candidate.email}`);
        results.sent++;
        continue;
      }
      const body = `Dear ${candidate.name},\n\nThank you for your interest in the ${details.jobTitle} position at PreciseHire.\n\nAfter careful review of your profile, we have decided not to move forward with your application at this time. We appreciate the time you invested in this process and wish you the best in your career search.\n\nBest regards,\nPreciseHire Recruitment Team`;
      const res = await sendEmail(candidate.email, `Application Update: ${details.jobTitle} - PreciseHire`, body);
      if (res.success) results.sent++;
      else throw new Error(res.error);
      
      await sleep(1100);
    } catch (e) {
      results.failed++;
      results.errors.push({ candidate: candidate.email, error: e.message });
    }
  }
  return results;
}
