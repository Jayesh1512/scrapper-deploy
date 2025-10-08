// api/puppeteer.js
// Deploy this file to Vercel and access at: https://your-project.vercel.app/api/puppeteer

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const config = {
  maxDuration: 60, // Requires Vercel Pro plan for >10 seconds
};

export default async function handler(req, res) {
  let browser = null;

  try {
    console.log('Launching browser...');
    
    // Launch browser optimized for Vercel serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Get URL and action from query parameters
    const url = req.query.url || 'https://example.com';
    const action = req.query.action || 'screenshot'; // screenshot, pdf, or content
    
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    let result;

    // Handle different actions
    switch (action) {
      case 'screenshot':
        console.log('Taking screenshot...');
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: req.query.fullPage === 'true',
        });
        
        await browser.close();
        browser = null;
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).send(screenshot);

      case 'pdf':
        console.log('Generating PDF...');
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
        });
        
        await browser.close();
        browser = null;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).send(pdf);

      case 'content':
        console.log('Extracting content...');
        const content = await page.evaluate(() => {
          return {
            title: document.title,
            heading: document.querySelector('h1')?.textContent || 'No heading',
            description: document.querySelector('meta[name="description"]')?.content || 'No description',
            paragraphs: Array.from(document.querySelectorAll('p')).length,
            links: Array.from(document.querySelectorAll('a')).length,
          };
        });
        
        await browser.close();
        browser = null;
        
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          success: true,
          url,
          content,
        });

      default:
        await browser.close();
        browser = null;
        
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be: screenshot, pdf, or content',
        });
    }

  } catch (error) {
    console.error('Error:', error);
    
    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  }
}