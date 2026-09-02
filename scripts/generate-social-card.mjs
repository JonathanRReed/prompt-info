import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const logoPath = path.join(
  projectRoot,
  'public',
  'prompt_info_assets',
  'prompt-info-logo-normal-1200w.png',
);
const outputPath = path.join(
  projectRoot,
  'public',
  'prompt_info_assets',
  'prompt-info-social-card-1200x630.png',
);
const logoBytes = await Bun.file(logoPath).arrayBuffer();
const logoDataUrl = `data:image/png;base64,${Buffer.from(logoBytes).toString('base64')}`;

await mkdir(path.dirname(outputPath), { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });

  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }

          html,
          body {
            width: 1200px;
            height: 630px;
            margin: 0;
            overflow: hidden;
            background: #070707;
            color: #f1f1f1;
          }

          body {
            position: relative;
            padding: 36px;
            font-family: Arial, Helvetica, sans-serif;
          }

          body::before {
            position: absolute;
            inset: 0;
            content: '';
            background-image:
              linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
            background-size: 40px 40px;
            mask-image: linear-gradient(to bottom, black, transparent 88%);
          }

          body::after {
            position: absolute;
            inset: 0;
            content: '';
            background: radial-gradient(circle at 82% 52%, rgba(230, 25, 25, 0.2), transparent 34%);
          }

          .frame {
            position: relative;
            z-index: 1;
            display: grid;
            width: 100%;
            height: 100%;
            grid-template-rows: auto 1fr auto;
            border: 1px solid #454545;
            box-shadow: 12px 12px 0 #a10f18;
          }

          .eyebrow,
          .footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
          }

          .eyebrow {
            border-bottom: 1px solid #454545;
            color: #b7b7b7;
          }

          .eyebrow strong { color: #e61919; }

          .brand {
            display: grid;
            place-items: center;
            min-height: 0;
            padding: 18px 34px 10px;
          }

          .brand img {
            display: block;
            width: 100%;
            max-width: 1030px;
            height: auto;
          }

          .footer {
            border-top: 1px solid #454545;
            color: #d7d7d7;
          }

          .footer span:last-child { color: #e61919; }
        </style>
      </head>
      <body>
        <main class="frame">
          <div class="eyebrow">
            <span>Hello.World Consulting / Product</span>
            <strong>LLM planning utility</strong>
          </div>
          <div class="brand">
            <img src="${logoDataUrl}" alt="Prompt Info" />
          </div>
          <div class="footer">
            <span>Token count · Checked pricing · Format comparison</span>
            <span>prompt-info.helloworldfirm.com</span>
          </div>
        </main>
      </body>
    </html>
  `);

  await page.screenshot({ path: outputPath });
  console.log(`Generated ${outputPath}`);
} finally {
  await browser.close();
}
