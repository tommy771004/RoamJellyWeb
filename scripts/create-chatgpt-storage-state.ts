import { chromium } from 'playwright';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'node:path';
import { chmod, mkdir } from 'node:fs/promises';

async function main(): Promise<void> {
  const outputPath = path.resolve(
    process.argv[2] || '.worker-secrets/chatgpt-storage-state.json',
  );
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    console.log('\n請在瀏覽器中手動完成 ChatGPT 登入。');
    console.log('確認首頁與輸入框都可正常使用後，再回到終端機。');

    const prompt = createInterface({ input, output });
    await prompt.question('\n完成登入後按 Enter 儲存 session...');
    prompt.close();

    await context.storageState({ path: outputPath });
    await chmod(outputPath, 0o600);
    console.log(`\n已寫入: ${outputPath}`);
    console.log('此檔案等同登入憑證，不可 commit。請轉成 base64 後存入 CHATGPT_STORAGE_STATE_B64。');
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
