type DispatchOptions = {
  jobId: string;
};

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const EVENT_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

export async function dispatchAiItineraryJob({ jobId }: DispatchOptions): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();
  const repository = process.env.GITHUB_AI_WORKER_REPO?.trim();
  const eventType = (process.env.GITHUB_AI_WORKER_EVENT || 'ai-itinerary').trim();

  if (!token) throw new Error('GITHUB_DISPATCH_TOKEN_NOT_CONFIGURED');
  if (!repository || !REPOSITORY_PATTERN.test(repository)) {
    throw new Error('GITHUB_AI_WORKER_REPO_INVALID');
  }
  if (!EVENT_PATTERN.test(eventType)) {
    throw new Error('GITHUB_AI_WORKER_EVENT_INVALID');
  }

  const response = await fetch(`https://api.github.com/repos/${repository}/dispatches`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'RoamJelly-AI-Dispatcher/1.0',
    },
    body: JSON.stringify({
      event_type: eventType,
      client_payload: { jobId },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`GITHUB_REPOSITORY_DISPATCH_FAILED:${response.status}:${body.slice(0, 300)}`);
  }
}
