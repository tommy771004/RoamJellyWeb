import { access } from 'node:fs/promises';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';

export type ChatGPTWebProviderOptions = {
  storageStatePath?: string;
  responseTimeoutMs?: number;
};

export class ChatGPTWebProvider {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private readonly responseTimeoutMs: number;

  constructor(private readonly options: ChatGPTWebProviderOptions) {
    const configuredTimeout = Number(options.responseTimeoutMs ?? 120_000);
    this.responseTimeoutMs = Number.isFinite(configuredTimeout)
      ? Math.min(Math.max(configuredTimeout, 30_000), 300_000)
      : 120_000;
  }

  async init(): Promise<void> {
    if (this.page) return;
    const storageStatePath = this.options.storageStatePath?.trim();
    if (!storageStatePath) throw new Error('CHATGPT_SESSION_NOT_CONFIGURED');
    await access(storageStatePath).catch(() => {
      throw new Error('CHATGPT_SESSION_NOT_AVAILABLE');
    });

    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      storageState: storageStatePath,
      serviceWorkers: 'block',
      viewport: { width: 1280, height: 900 },
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30_000);
  }

  private async assertUsablePage(page: Page): Promise<void> {
    const url = page.url().toLowerCase();
    if (url.includes('/auth/login') || url.includes('/login')) {
      throw new Error('CHATGPT_AUTH_REQUIRED');
    }

    const text = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
    const challengeHints = [
      'verify you are human',
      'checking your browser',
      'security check',
      'captcha',
      '請驗證您是真人',
      '驗證您是真人',
    ];
    if (challengeHints.some((hint) => text.includes(hint))) {
      throw new Error('CHATGPT_CHALLENGE_REQUIRED');
    }
  }

  async generate(prompt: string): Promise<string> {
    if (!prompt.trim()) throw new Error('CHATGPT_PROMPT_EMPTY');
    await this.init();
    const page = this.page!;

    await page.goto('https://chatgpt.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await this.assertUsablePage(page);

    const assistantSelector = '[data-message-author-role="assistant"]';
    const beforeCount = await page.locator(assistantSelector).count();
    const editor = page
      .locator('#prompt-textarea, [contenteditable="true"][role="textbox"], textarea')
      .first();
    await editor.waitFor({ state: 'visible', timeout: 30_000 });
    await editor.fill(prompt);
    await editor.press('Enter');

    const startedAt = Date.now();
    while (Date.now() - startedAt < this.responseTimeoutMs) {
      await this.assertUsablePage(page);
      if (await page.locator(assistantSelector).count() > beforeCount) break;
      await page.waitForTimeout(750);
    }

    if (await page.locator(assistantSelector).count() <= beforeCount) {
      throw new Error('CHATGPT_RESPONSE_TIMEOUT');
    }

    const last = page.locator(assistantSelector).last();
    const stopControl = page.locator(
      '[data-testid="stop-button"], button[aria-label*="Stop generating"], button[aria-label*="停止生成"]',
    );
    let previous = '';
    let stableCount = 0;

    while (Date.now() - startedAt < this.responseTimeoutMs) {
      await this.assertUsablePage(page);
      const current = (await last.innerText().catch(() => '')).trim();
      const generationStopped = await stopControl.count() === 0;

      if (current && current === previous && generationStopped) {
        stableCount += 1;
        if (stableCount >= 3) return current;
      } else {
        stableCount = 0;
        previous = current;
      }

      await page.waitForTimeout(1_500);
    }

    if (previous) return previous;
    throw new Error('CHATGPT_EMPTY_RESPONSE');
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.page = null;
    this.context = null;
    this.browser = null;
  }
}
