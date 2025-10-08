// api/puppeteer.js
// Using @sparticuz/chromium-min for better Vercel compatibility

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  const { url, action = 'screenshot', fullPage = 'false' } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Please provide a URL parameter' });
  }

  // Validate URL
  let targetUrl = url.trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return res.status(400).json({ error: 'URL must start with http:// or https://' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  let browser;
  
  try {
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer;
    let launchOptions = {
      headless: true,
    };

    if (isVercel) {
      // Use chromium-min package with hosted chromium binary
      const chromium = (await import('@sparticuz/chromium-min')).default;
      puppeteer = await import('puppeteer-core');
      
      // Use GitHub-hosted chromium binary (version 121 is stable)
      const CHROMIUM_URL = 'https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar';
      
      launchOptions = {
        args: [
          ...chromium.args,
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--no-zygote',
          '--single-process',
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(CHROMIUM_URL),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      // Use regular puppeteer locally
      puppeteer = await import('puppeteer');
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    
    await page.goto(parsedUrl.toString(), {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Handle different actions
    switch (action) {
      case 'screenshot': {
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: fullPage === 'true',
        });
        
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'inline; filename="screenshot.png"');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).send(screenshot);
      }

      case 'pdf': {
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="page.pdf"');
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        return res.status(200).send(pdf);
      }

      case 'content': {
        const content = await page.evaluate(() => {
          return {
            title: document.title,
            heading: document.querySelector('h1')?.textContent || 'No heading',
            description: document.querySelector('meta[name="description"]')?.content || 'No description',
            paragraphs: Array.from(document.querySelectorAll('p')).length,
            links: Array.from(document.querySelectorAll('a')).length,
          };
        });
        
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json({
          success: true,
          url: parsedUrl.toString(),
          content,
        });
      }

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be: screenshot, pdf, or content',
        });
    }

  } catch (error) {
    console.error('Puppeteer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}