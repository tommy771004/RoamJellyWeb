import 'dotenv/config';
import { db, pool } from '../src/server/db/client';
import { AiJobRepository } from '../src/server/repositories/aiJobRepository';
import { ChatGPTWebProvider } from '../src/server/services/chatgptWebProvider';
import { WorkerAiProvider } from '../src/server/services/workerAiProvider';
import { generateItineraryWithTextGenerator } from '../src/server/services/aiItineraryService';

async function main(): Promise<void> {
  const jobId = process.env.JOB_ID?.trim();
  if (!jobId) throw new Error('JOB_ID_REQUIRED');
  if (!db) throw new Error('DATABASE_URL_REQUIRED');

  const aiJobRepo = new AiJobRepository(db);
  const claim = await aiJobRepo.claimJob(jobId);
  if (!claim.claimed) {
    console.log(`[AI Worker] Job ${jobId} is already ${claim.job.status}; skipping duplicate delivery.`);
    return;
  }
  if (claim.job.type !== 'itinerary') throw new Error(`AI_JOB_TYPE_UNSUPPORTED:${claim.job.type}`);

  const chatgpt = new ChatGPTWebProvider({
    storageStatePath: process.env.CHATGPT_STORAGE_STATE_PATH?.trim(),
    responseTimeoutMs: Number(process.env.AI_CHATGPT_RESPONSE_TIMEOUT_MS ?? 120_000),
  });
  const provider = new WorkerAiProvider(chatgpt);

  try {
    const result = await generateItineraryWithTextGenerator(
      claim.job.request,
      (prompt) => provider.generate(prompt),
      { strictFailure: true },
    );

    await aiJobRepo.completeItineraryJob(claim.job, {
      result,
      provider: provider.stats.provider,
      fallbackUsed: provider.stats.fallbackUsed,
      primaryError: provider.stats.primaryError,
    });

    console.log(`[AI Worker] Job ${jobId} completed via ${provider.stats.provider}.`);
  } catch (error) {
    await aiJobRepo.markFailed(jobId, error, provider.stats.primaryError);
    throw error;
  } finally {
    await provider.close();
  }
}

main()
  .catch((error) => {
    console.error('[AI Worker] fatal:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end().catch(() => undefined);
  });
