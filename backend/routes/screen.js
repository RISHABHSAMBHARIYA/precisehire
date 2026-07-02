import express from 'express';
import { getCandidatesByJob, saveJob, updateCandidate } from '../services/dynamoService.js';
import { fetchResume } from '../services/resumeFetcher.js';
import { extractText } from '../services/textExtractor.js';
import { categorizeCandidates, scoreCandidates } from '../services/nvidiaService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { jobId, jobDetails, weightage } = req.body;

    // Input validation
    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid jobId. A valid string jobId is required.' 
      });
    }
    if (!jobDetails || typeof jobDetails !== 'object') {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing or invalid jobDetails. An object with job details is required.' 
      });
    }

    let candidates = await getCandidatesByJob(jobId);

    // If no candidates found for this jobId, return 400 error
    if (!candidates || candidates.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No candidates found for jobId: ${jobId}. Ensure candidates are uploaded before screening.`
      });
    }

    console.log(`[SCREEN] Starting screening for ${candidates.length} candidates...`);

    // 1. Fetch & Extract Text if missing (Parallel)
    console.log('[SCREEN] Stage 1: Fetching & Extracting resumes...');
    await Promise.all(candidates.map(async (candidate) => {
      if (!candidate.resumeText && candidate.resumeLink) {
        try {
          const fetchRes = await fetchResume(candidate.resumeLink);
          if (fetchRes.success) {
            const extractRes = await extractText(fetchRes.buffer, fetchRes.mimeType);
            if (extractRes.success) {
              candidate.resumeText = extractRes.text;
              await updateCandidate(candidate.candidateId, jobId, { resumeText: extractRes.text });
            }
          }
        } catch (e) {
          console.error(`[SCREEN] Fetch/Extract failed for ${candidate.name}:`, e.message);
        }
      }
    }));

    // 2. Score & Categorize all candidates against the JD (Parallelized in nvidiaService)
    console.log('[SCREEN] Stage 2: Scoring and Categorizing candidates...');
    const scoredList = await scoreCandidates(candidates, jobDetails, weightage);

    // 4. Save results to Dynamo (Parallel)
    console.log('[SCREEN] Stage 3: Saving results to database...');
    await Promise.all(scoredList.map(async (c) => {
      const updates = {
        role: c.role,
        skills_score: c.skills_score,
        experience_score: c.experience_score,
        quality_score: c.quality_score,
        weighted_score: c.weighted_score,
        matched_skills: c.matched_skills,
        missing_skills: c.missing_skills,
        justification: c.justification,
        rank: c.rank,
        status: 'shortlisted'
      };
      await updateCandidate(c.candidateId, jobId, updates);
    }));

    // 6. Save Job Details
    console.log('[SCREEN] Stage 4: Saving job details...');
    await saveJob({
      jobId,
      ...jobDetails,
      weightage,
      totalCandidates: scoredList.length
    });

    console.log('[SCREEN] All steps completed successfully. Sending response.');
    res.json({
      success: true,
      totalCandidates: candidates.length,
      roleMatchCount: scoredList.length,
      candidates: scoredList
    });
  } catch (error) {
    console.error('[SCREEN] CRITICAL ERROR:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:jobId', async (req, res) => {
  try {
    const candidates = await getCandidatesByJob(req.params.jobId);
    candidates.sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0));
    res.json({ success: true, candidates });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
