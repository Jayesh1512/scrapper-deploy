// api/scrape-instagram.js
// Instagram Profile Scraper for Vercel with Cookie File Support

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
    // Try multiple possible locations
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

    console.log('No cookie file found in expected locations');
    return null;
  } catch (error) {
    console.log('Error loading cookies from file:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { profile } = req.body;

  if (!profile) {
    return res.status(400).json({ error: 'Profile URL is required in request body' });
  }

  // Get credentials from environment variables (fallback if cookies don't work)
  const INSTAGRAM_USERNAME = process.env.INSTAGRAM_USERNAME;
  const INSTAGRAM_PASSWORD = process.env.INSTAGRAM_PASSWORD;

  let browser;

  try {
    // Dynamic import based on environment
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer;
    let launchOptions = {
      headless: true,
    };

    if (isVercel) {
      // Use chromium package with proven Vercel compatibility
      const chromium = (await import('@sparticuz/chromium')).default;
      puppeteer = await import('puppeteer-core');

      // Disable WebGL for better compatibility
      chromium.setGraphicsMode = false;

      launchOptions = {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      };
    } else {
      // Use regular puppeteer locally
      puppeteer = await import('puppeteer');
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    // Try to load cookies from file first
    if (!cachedCookies) {
      cachedCookies = loadCookiesFromFile();
    }

    // Load cookies if available
    if (cachedCookies && cachedCookies.length > 0) {
      console.log(`Loading ${cachedCookies.length} cookies...`);
      await page.setCookie(...cachedCookies);
    }

    // Navigate to Instagram
    await page.goto('https://www.instagram.com/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Check if already logged in by checking current URL
    const currentUrl = page.url();
    
    // If redirected to login page, need to login
    if (currentUrl.includes('/accounts/login/')) {
      console.log('Cookies expired or invalid, logging in...');
      
      if (!INSTAGRAM_USERNAME || !INSTAGRAM_PASSWORD) {
        await browser.close();
        return res.status(500).json({ 
          error: 'Instagram credentials not configured',
          message: 'Cookies expired and no credentials found in environment variables'
        });
      }

      // Perform login
      try {
        await page.waitForSelector('input[name="username"]', { visible: true, timeout: 10000 });
        await page.type('input[name="username"]', INSTAGRAM_USERNAME, { delay: 100 });
        await page.type('input[name="password"]', INSTAGRAM_PASSWORD, { delay: 100 });
        
        await Promise.all([
          page.click('button[type="submit"]'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        ]);

        // Check if login was successful
        const loginUrl = page.url();
        if (loginUrl.includes('/accounts/login/')) {
          throw new Error('Login failed. Please check your credentials.');
        }

        // Save new cookies for future requests
        const newCookies = await page.cookies();
        cachedCookies = newCookies;
        console.log('Login successful, new cookies cached');

      } catch (error) {
        await browser.close();
        return res.status(401).json({ 
          error: 'Login failed',
          message: error.message 
        });
      }
    } else {
      console.log('Successfully logged in using cookies!');
    }

    // Navigate to the target profile
    await page.goto(profile, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForSelector('body', { timeout: 10000 });

    // Check if profile image exists (to detect private accounts)
    let privateAcc = false;
    const profileImageExists = await page
      .waitForSelector('._aagu', {
        visible: true,
        timeout: 3000,
      })
      .catch(() => null);

    if (!profileImageExists) {
      console.log('Account is private or profile image not found');
      privateAcc = true;
    } else {
      privateAcc = false;
      await page.hover('._aagu').catch(() => {});
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

    // Extract stats (posts, followers, following)
    const stats = $('header').find('span.x5n08af');
    
    // Extract description
    const descElement = $('header').find('span._ap3a');
    const desc = descElement.length ? descElement.text().trim() : '';

    // Extract profile picture
    const profilePicElement = $('img[alt*="profile picture"]').attr('src') || '';

    // Extract username from URL
    const extractedUsername = profile.split('instagram.com/')[1].split('/')[0];

    // Calculate NPLU (numeric character count / username length)
    const numericCount = (extractedUsername.match(/\d/g) || []).length;
    const nplu = numericCount / extractedUsername.length;

    // Check if user has profile picture
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

    // Extract stats if available
    if (stats.length >= 3) {
      const posts = $(stats[0]).text().trim();
      const followers = $(stats[1]).text().trim();
      const following = $(stats[2]).text().trim();

      result = {
        ...result,
        posts: posts,
        followers: followers,
        following: following,
      };
    } else {
      result = {
        ...result,
        posts: 'N/A',
        followers: 'N/A',
        following: 'N/A',
      };
    }

    await browser.close();
    browser = null;

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Instagram scraping error:', error);
    
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