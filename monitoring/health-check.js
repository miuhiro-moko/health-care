try { require('dotenv').config(); } catch (_) {}

const { chromium } = require('playwright');

function parseBooleanEnv(value, defaultValue) {
  if (value === undefined) return defaultValue;
  const lower = String(value).toLowerCase();
  if (["1", "true", "yes", "on"].includes(lower)) return true;
  if (["0", "false", "no", "off"].includes(lower)) return false;
  return defaultValue;
}

const config = {
  baseUrl: process.env.FRONT_URL || 'https://stg.front.geechat.jp',
  basicAuth: {
    username: process.env.BASIC_AUTH_USER,
    password: process.env.BASIC_AUTH_PASS
  },
  aiName: process.env.AI_NAME || 'sample1',
  testQuestions: (process.env.QUESTIONS ? process.env.QUESTIONS.split(',') : ['質問1','質問2'])
    .map(s => s.trim()).filter(Boolean),
  timeout: Number(process.env.TIMEOUT_MS || 30000),
  headless: parseBooleanEnv(process.env.HEADLESS, true),
  retries: Math.max(1, Number(process.env.RETRIES || 1))
};

async function healthCheck() {
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    httpCredentials: config.basicAuth
  });
  const page = await context.newPage();

  try {
    const url = `${config.baseUrl}?ai_name=${config.aiName}`;
    const timestamp = new Date().toISOString();
    
    console.log(`[${timestamp}] 🚀 Starting health check: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const question = config.testQuestions[Math.floor(Math.random() * config.testQuestions.length)];
    console.log(`[${timestamp}] 📝 Sending question: "${question}"`);

    const inputSelector = 'input[placeholder*="質問"], textarea[placeholder*="質問"], input[type="text"]';
    await page.waitForSelector(inputSelector, { timeout: 10000 });
    await page.fill(inputSelector, question);
    
    const submitButton = page.getByRole('button', { name: /送信/ });
    await submitButton.click();

    const answerSelectors = [
      'text=AIチャットbotより回答します',
      'text=この回答に満足されましたか？',
      '[data-testid="answer"]',
      '.answer-content'
    ];
    
    let answerFound = false;
    for (const selector of answerSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: config.timeout });
        answerFound = true;
        break;
      } catch (e) {
        // Next selector
      }
    }

    if (!answerFound) {
      throw new Error('回答が表示されませんでした');
    }
    
    const endTime = new Date().toISOString();
    console.log(`[${endTime}] ✅ Health check passed - Question: "${question}"`);
    
    return { 
      success: true, 
      question, 
      startTime: timestamp,
      endTime,
      url
    };

  } catch (error) {
    const errorTime = new Date().toISOString();
    console.error(`[${errorTime}] ❌ Health check failed:`, error.message);
    
    try {
      const fs = require('fs');
      const path = require('path');
      
      // screenshots ディレクトリを作成（存在しない場合）
      const screenshotsDir = './screenshots';
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }
      
      // 日付付きファイル名で保存
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(screenshotsDir, `error-${timestamp}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
    } catch (screenshotError) {
      console.error('Failed to save screenshot:', screenshotError.message);
    }
    
    return { 
      success: false, 
      error: error.message, 
      timestamp: errorTime,
      url: config.baseUrl
    };
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  withRetry(config.retries)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

async function withRetry(retries) {
  let lastResult = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    if (attempt > 1) {
      const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt - 2));
      console.log(`[${new Date().toISOString()}] 🔁 Retry attempt ${attempt}/${retries} (wait ${backoffMs}ms)`);
      await new Promise(r => setTimeout(r, backoffMs));
    }
    lastResult = await healthCheck();
    if (lastResult && lastResult.success) return lastResult;
  }
  return lastResult;
}

module.exports = { healthCheck, withRetry };
