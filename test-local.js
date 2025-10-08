// test-instagram-scraper.js
// Test the Instagram scraper API on Vercel

import https from 'https';

// 🔥 UPDATE THIS TO YOUR VERCEL URL
const VERCEL_URL = 'https://scrapper-deploy-chi.vercel.app';

// 🔥 UPDATE THESE WITH YOUR INSTAGRAM CREDENTIALS
const INSTAGRAM_USERNAME = 'your_instagram_username';
const INSTAGRAM_PASSWORD = 'your_instagram_password';

// 🔥 UPDATE THIS WITH THE PROFILE YOU WANT TO SCRAPE
const PROFILE_TO_SCRAPE = 'https://www.instagram.com/cristiano/';

async function testInstagramScraper() {
  console.log('🚀 Testing Instagram Scraper on Vercel\n');
  console.log('='.repeat(60));
  console.log(`📍 Vercel URL: ${VERCEL_URL}`);
  console.log(`👤 Target Profile: ${PROFILE_TO_SCRAPE}`);
  console.log('='.repeat(60));

  if (INSTAGRAM_USERNAME === 'your_instagram_username') {
    console.log('\n⚠️  WARNING: Please update your Instagram credentials in the test file!');
    return;
  }

  const data = JSON.stringify({
    profile: PROFILE_TO_SCRAPE,
    username: INSTAGRAM_USERNAME,
    password: INSTAGRAM_PASSWORD
  });

  const url = new URL(VERCEL_URL);
  
  const options = {
    hostname: url.hostname,
    port: 443,
    path: '/api/scrape-instagram',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    console.log('\n📤 Sending request...');
    console.log(`   Endpoint: POST ${VERCEL_URL}/api/scrape-instagram`);
    console.log(`   This may take 30-60 seconds...\n`);

    const startTime = Date.now();

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`📥 Response received in ${duration}s`);
        console.log(`   Status: ${res.statusCode}`);
        console.log('-'.repeat(60));

        try {
          const response = JSON.parse(body);

          if (res.statusCode === 200 && response.success) {
            console.log('✅ SUCCESS! Instagram profile scraped successfully\n');
            console.log('📊 Scraped Data:');
            console.log(JSON.stringify(response.data, null, 2));
          } else {
            console.log('❌ FAILED');
            console.log(JSON.stringify(response, null, 2));
          }
        } catch (error) {
          console.log('❌ ERROR: Invalid JSON response');
          console.log('Raw response:', body);
        }

        console.log('\n' + '='.repeat(60));
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Request failed: ${error.message}`);
      reject(error);
    });

    req.setTimeout(65000, () => {
      req.destroy();
      console.log('❌ Request timeout (65 seconds)');
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testInstagramScraper().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});