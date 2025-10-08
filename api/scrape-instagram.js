// api/scrape-instagram.js
// Instagram Profile Scraper for Vercel using Playwright

import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const config = {
  maxDuration: 60,
};

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store cookies in memory (persists during warm starts)
let cachedCookies = null;

// Function to load cookies from file
function loadCookiesFromFile() {
  try {
    const possiblePaths = [
      path.join(__dirname, '..', 'src', 'instagram_cookies.json'),
      path.join(__dirname, '..', 'instagram_cookies.json'),
      path.join(process.cwd(), 'src', 'instagram_cookies.json'),
      path.join(process.cwd(), 'instagram_cookies.json'),
    ];

    for (const cookiePath of possiblePaths) {
      if (fs.existsSync(cookiePath)) {
        console.log(`Loading cookies from: ${cookiePath}`);
        const cookieData = fs.readFileSync(cookiePath, 'utf8');
        return JSON.parse(cookieData);
      }
    }

    console.log('No cookie file found');
    return null;
  } catch (error) {
    console.log('Error loading cookies:', error.message);
    return null;
  }
}

// Convert Puppeteer cookies to Playwright format
function convertCookiesToPlaywright(puppeteerCookies) {
  if (!puppeteerCookies) return null;
  
  return puppeteerCookies.map(cookie => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path || '/',
    expires: cookie.expires || -1,
    httpOnly: cookie.httpOnly || false,
    secure: cookie.secure || false,
    sameSite: cookie.sameSite || 'Lax'
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { profile } = req.body;

  if (!profile) {
    return res.status(400).json({ error: 'Profile URL is required' });
  }

  const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME;
  const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD;

  let browser;

  try {
    const isVercel = !!process.env.VERCEL_ENV;
    let playwright;

    if (isVercel) {
      // Use playwright-aws-lambda for Vercel
      playwright = await import('playwright-aws-lambda');
    } else {
      // Use regular playwright locally
      playwright = await import('playwright');
    }

    // Launch browser
    if (isVercel) {
      browser = await playwright.default.launchChromium({
        headless: true,
      });
    } else {
      browser = await playwright.chromium.launch({
        headless: true,
      });
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    // Load cookies if available
    if (!cachedCookies) {
      cachedCookies = loadCookiesFromFile();
    }

    if (cachedCookies) {
      const playwrightCookies = convertCookiesToPlaywright(cachedCookies);
      if (playwrightCookies) {
        console.log(`Loading ${playwrightCookies.length} cookies...`);
        await context.addCookies(playwrightCookies);
      }
    }

    const page = await context.newPage();

    // Navigate to Instagram
    await page.goto('https://www.instagram.com/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const currentUrl = page.url();

    // If redirected to login, perform login
    if (currentUrl.includes('/accounts/login/')) {
      console.log('Logging in to Instagram...');

      if (!INSTAGRAM_USERNAME || !INSTAGRAM_PASSWORD) {
        await browser.close();
        return res.status(500).json({
          error: 'Instagram credentials not configured',
          message: 'Please set INSTAGRAM_USERNAME and INSTAGRAM_PASSWORD'
        });
      }

      try {
        await page.waitForSelector('input[name="username"]', { state: 'visible', timeout: 10000 });
        await page.fill('input[name="username"]', INSTAGRAM_USERNAME);
        await page.fill('input[name="password"]', INSTAGRAM_PASSWORD);
        
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        ]);

        const loginUrl = page.url();
        if (loginUrl.includes('/accounts/login/')) {
          throw new Error('Login failed');
        }

        // Save cookies
        const newCookies = await context.cookies();
        cachedCookies = newCookies;
        console.log('Login successful');

      } catch (error) {
        await browser.close();
        return res.status(401).json({
          error: 'Login failed',
          message: error.message
        });
      }
    } else {
      console.log('Logged in using cookies');
    }

    // Navigate to profile
    await page.goto(profile, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForSelector('body', { timeout: 10000 });

    // Check for private account
    let privateAcc = false;
    try {
      await page.waitForSelector('._aagu', { state: 'visible', timeout: 3000 });
      await page.hover('._aagu');
    } catch {
      console.log('Account is private');
      privateAcc = true;
    }

    // Extract page content
    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);

    // Extract likes and comments
    const likesArray = [];
    $('li.x972fbf').each((index, element) => {
      const text = $(element).text().trim();
      likesArray.push(text);
    });

    const likes = likesArray[0] || 'N/A';
    const comments = likesArray[1] || 'N/A';

    // Extract stats
    const stats = $('header').find('span.x5n08af');
    const descElement = $('header').find('span._ap3a');
    const desc = descElement.length ? descElement.text().trim() : '';
    const profilePicElement = $('img[alt*="profile picture"]').attr('src') || '';

    const extractedUsername = profile.split('instagram.com/')[1].split('/')[0];
    const numericCount = (extractedUsername.match(/\d/g) || []).length;
    const nplu = numericCount / extractedUsername.length;
    const hasProfilePicture = profilePicElement.includes('https://scontent');

    let result = {
      username: extractedUsername,
      nplu: nplu,
      hasProfilePicture: hasProfilePicture,
      profilePicture: profilePicElement,
      privateAcc: privateAcc,
      desc: desc,
      likes: likes,
      comments: comments,
    };

    if (stats.length >= 3) {
      result.posts = $(stats[0]).text().trim();
      result.followers = $(stats[1]).text().trim();
      result.following = $(stats[2]).text().trim();
    } else {
      result.posts = 'N/A';
      result.followers = 'N/A';
      result.following = 'N/A';
    }

    await browser.close();

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Scraping error:', error);

    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to scrape Instagram profile',
      message: error.message,
    });
  }
}