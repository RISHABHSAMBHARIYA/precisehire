import express from 'express';
import { 
  sendInterviewInvites, 
  sendAssessmentLinks, 
  sendOfferLetters, 
  sendRoundClearance, 
  sendRejectionEmail,
  sendEmail
} from '../services/sesMailer.js';
import { updateCandidate } from '../services/dynamoService.js';

const router = express.Router();

// Test route to verify SMTP setup
router.get('/test', async (req, res) => {
  try {
    const testUser = process.env.GMAIL_USER;
    console.log(`[SMTP TEST] Sending test email to ${testUser}...`);
    const result = await sendEmail(
      testUser, 
      'PreciseHire SMTP Test', 
      'This is a test email from PreciseHire to verify your Nodemailer Gmail SMTP configuration. If you are reading this, your email system is working correctly!'
    );
    
    if (result.success) {
      res.json({ success: true, message: `Test email sent successfully to ${testUser}` });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/interview', async (req, res) => {
  try {
    const { candidates, details } = req.body;
    if (!Array.isArray(candidates)) {
      return res.json({ success: false, error: 'candidates must be an array', sent: 0, failed: 0 });
    }
    // Handle empty candidates array gracefully
    if (candidates.length === 0) {
      return res.json({ success: true, sent: 0, failed: 0 });
    }
    // Validate candidates objects
    for (const c of candidates) {
      if (!c || typeof c !== 'object' || !c.candidateId) {
        return res.json({ success: false, error: 'Each candidate must contain a candidateId', sent: 0, failed: 0 });
      }
    }
    console.log(`[EMAIL] Sending interview invites to ${candidates?.length} candidates...`);
    const results = await sendInterviewInvites(candidates, details);
    
    for (const c of candidates) {
      try {
        await updateCandidate(c.candidateId, c.jobId || details?.jobId, { status: 'invited', currentRound: 'Interview' });
      } catch (updateErr) {
        console.warn(`[EMAIL] Failed to update candidate ${c.candidateId} in DB:`, updateErr.message);
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/assessment', async (req, res) => {
  try {
    const { candidates, details } = req.body;
    if (!Array.isArray(candidates)) {
      return res.json({ success: false, error: 'candidates must be an array', sent: 0, failed: 0 });
    }
    // Validate candidates objects
    for (const c of candidates) {
      if (!c || typeof c !== 'object' || !c.candidateId) {
        return res.json({ success: false, error: 'Each candidate must contain a candidateId', sent: 0, failed: 0 });
      }
    }
    console.log(`[EMAIL] Sending assessment links to ${candidates?.length} candidates...`);
    const results = await sendAssessmentLinks(candidates, details);
    
    for (const c of candidates) {
      try {
        await updateCandidate(c.candidateId, c.jobId || details?.jobId, { status: 'assessment_sent' });
      } catch (updateErr) {
        console.warn(`[EMAIL] Failed to update candidate ${c.candidateId} in DB:`, updateErr.message);
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/offer', async (req, res) => {
  try {
    const { candidates, details } = req.body;
    if (!Array.isArray(candidates)) {
      return res.json({ success: false, error: 'candidates must be an array', sent: 0, failed: 0 });
    }
    // Validate candidates objects
    for (const c of candidates) {
      if (!c || typeof c !== 'object' || !c.candidateId) {
        return res.json({ success: false, error: 'Each candidate must contain a candidateId', sent: 0, failed: 0 });
      }
    }
    console.log(`[EMAIL] Sending offer letters to ${candidates?.length} candidates...`);
    const results = await sendOfferLetters(candidates, details);
    
    for (const c of candidates) {
      try {
        await updateCandidate(c.candidateId, c.jobId || details?.jobId, { status: 'offered', currentRound: 'Offer' });
      } catch (updateErr) {
        console.warn(`[EMAIL] Failed to update candidate ${c.candidateId} in DB:`, updateErr.message);
      }
    }

    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/round-clearance', async (req, res) => {
  try {
    const { candidates, details } = req.body;
    if (!Array.isArray(candidates)) {
      return res.json({ success: false, error: 'candidates must be an array', sent: 0, failed: 0 });
    }
    // Validate candidates objects
    for (const c of candidates) {
      if (!c || typeof c !== 'object' || !c.candidateId) {
        return res.json({ success: false, error: 'Each candidate must contain a candidateId', sent: 0, failed: 0 });
      }
    }
    console.log(`[EMAIL] Sending round clearance to ${candidates?.length} candidates...`);
    const results = await sendRoundClearance(candidates, details);
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/rejection', async (req, res) => {
  try {
    const { candidates, details } = req.body;
    if (!Array.isArray(candidates)) {
      return res.json({ success: false, error: 'candidates must be an array', sent: 0, failed: 0 });
    }
    // Validate candidates objects
    for (const c of candidates) {
      if (!c || typeof c !== 'object' || !c.candidateId) {
        return res.json({ success: false, error: 'Each candidate must contain a candidateId', sent: 0, failed: 0 });
      }
    }
    console.log(`[EMAIL] Sending rejection emails to ${candidates?.length} candidates...`);
    const results = await sendRejectionEmail(candidates, details);
    res.json({ success: true, ...results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
