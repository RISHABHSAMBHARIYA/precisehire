import express from 'express';
import { getCandidatesByJob, updateCandidate, getJob, updateJob } from '../services/dynamoService.js';

const router = express.Router();

const DEFAULT_ROUNDS = ['ATS', 'Interview', 'Technical', 'Offer'];

async function getPipelineData(jobId) {
  const [candidates, job] = await Promise.all([
    getCandidatesByJob(jobId),
    getJob(jobId)
  ]);
  
  const rounds = job?.rounds || DEFAULT_ROUNDS;
  const candidatesByRound = {};
  rounds.forEach(r => candidatesByRound[r] = []);
  candidatesByRound['Eliminated'] = [];

  const pipelineCandidates = candidates.filter(c => c.status === 'in_pipeline' || c.status === 'passed' || c.status === 'eliminated');

  pipelineCandidates.forEach(c => {
    const round = c.currentRound || rounds[0];
    if (!candidatesByRound[round]) candidatesByRound[round] = [];
    candidatesByRound[round].push(c);
  });

  const stats = {
    total: pipelineCandidates.length,
    inProgress: pipelineCandidates.filter(c => c.status !== 'eliminated' && c.currentRound !== 'Selected').length,
    progressed: pipelineCandidates.filter(c => c.status !== 'eliminated' && c.currentRound !== 'Selected').length,
    eliminated: pipelineCandidates.filter(c => c.status === 'eliminated').length,
    selected: pipelineCandidates.filter(c => c.currentRound === 'Selected').length
  };

  return { rounds, candidatesByRound, stats };
}

router.get('/status/:jobId', async (req, res) => {
  try {
    const data = await getPipelineData(req.params.jobId);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { jobId, candidateIds } = req.body;

    // Input validation
    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
      return res.status(400).json({ success: false, error: 'Missing or invalid jobId' });
    }
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ success: false, error: 'candidateIds must be a non-empty array' });
    }

    console.log(`[PIPELINE] Initializing pipeline for ${candidateIds.length} candidates...`);
    
    const job = await getJob(jobId);
    const rounds = job?.rounds || DEFAULT_ROUNDS;
    if (!job?.rounds) {
      await updateJob(jobId, { rounds: DEFAULT_ROUNDS });
    }

    for (const id of candidateIds) {
      try {
        await updateCandidate(id, jobId, { 
          currentRound: rounds[0], 
          status: 'in_pipeline' 
        });
      } catch (updateErr) {
        console.warn(`[PIPELINE] Failed to update candidate ${id}:`, updateErr.message);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[PIPELINE] Create error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/mark-result', async (req, res) => {
  try {
    const { candidateId, jobId, result, currentRound } = req.body;

    // Input validation
    if (!candidateId || typeof candidateId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid candidateId' });
    }
    if (!jobId || typeof jobId !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid jobId' });
    }
    if (!result || typeof result !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing or invalid result' });
    }

    const job = await getJob(jobId);
    const rounds = job?.rounds || DEFAULT_ROUNDS;
    
    if (result === 'fail') {
      await updateCandidate(candidateId, jobId, { status: 'eliminated', currentRound: 'Eliminated' });
    } else {
      const currentIndex = rounds.indexOf(currentRound);
      const nextRound = rounds[currentIndex + 1] || 'Selected';
      const status = nextRound === 'Selected' ? 'passed' : 'in_pipeline';
      await updateCandidate(candidateId, jobId, { currentRound: nextRound, status });
    }
    
    const data = await getPipelineData(jobId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[PIPELINE] Mark result error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/add-round', async (req, res) => {
  try {
    const { jobId, roundName } = req.body;
    const job = await getJob(jobId);
    
    const currentRounds = job?.rounds || DEFAULT_ROUNDS;
    if (currentRounds.includes(roundName)) {
      return res.json({ success: true, message: 'Round already exists' });
    }

    const selectedIdx = currentRounds.indexOf('Selected');
    const newRounds = [...currentRounds];
    
    if (selectedIdx !== -1) {
      newRounds.splice(selectedIdx, 0, roundName);
    } else {
      newRounds.push(roundName);
    }

    console.log(`[PIPELINE] Updating job ${jobId} with rounds:`, newRounds);
    await updateJob(jobId, { rounds: newRounds });
    
    const data = await getPipelineData(jobId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[PIPELINE] Add round error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/move-candidate', async (req, res) => {
  try {
    const { candidateId, jobId, targetRound } = req.body;
    console.log(`[PIPELINE] Moving candidate ${candidateId} to ${targetRound}`);
    
    const update = { currentRound: targetRound };
    if (targetRound === 'Eliminated') {
      update.status = 'eliminated';
    } else if (targetRound === 'Selected') {
      update.status = 'passed';
    } else {
      update.status = 'in_pipeline';
    }
    
    await updateCandidate(candidateId, jobId, update);
    
    const data = await getPipelineData(jobId);
    res.json({ success: true, ...data });
  } catch (error) {
    console.error('[PIPELINE] Move error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
