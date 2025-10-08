// test-vercel-deployment.js
// Test your deployed Puppeteer API on Vercel
// Run with: node test-vercel-deployment.js

import https from 'https';
import fs from 'fs';

// 🔥 CHANGE THIS TO YOUR VERCEL DEPLOYMENT URL
const VERCEL_URL = 'https://scrapper-deploy-chi.vercel.app';

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    console.log(`   Requesting: ${url}`);
    
    https.get(url, (res) => {
      const chunks = [];
      let totalSize = 0;
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
      });
      
      res.on('end', () => {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        const buffer = Buffer.concat(chunks);
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer,
          duration: duration,
          size: totalSize,
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Test function
async function testDeployment() {
  console.log('\n🚀 Testing Vercel Puppeteer Deployment');
  console.log('='.repeat(60));
  console.log(`📍 Vercel URL: ${VERCEL_URL}`);
  console.log('='.repeat(60));
  
  if (VERCEL_URL === 'https://your-project.vercel.app') {
    console.log('\n⚠️  WARNING: Please update VERCEL_URL with your actual deployment URL!');
    console.log('   Find it at: https://vercel.com/dashboard\n');
    return;
  }
  
  const testURL = 'https://example.com';
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Screenshot
  console.log('\n\n📸 TEST 1: Screenshot');
  console.log('-'.repeat(60));
  try {
    const url = `${VERCEL_URL}/api/puppeteer?url=${encodeURIComponent(testURL)}&action=screenshot`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const filename = 'vercel-screenshot.png';
      fs.writeFileSync(filename, result.body);
      console.log(`   ✅ SUCCESS!`);
      console.log(`   📁 Saved: ${filename}`);
      console.log(`   📊 Size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`   ⏱️  Time: ${result.duration}s`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.statusCode}`);
      console.log(`   Response: ${result.body.toString()}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }
  
  // Test 2: Full Page Screenshot
  console.log('\n\n📸 TEST 2: Full Page Screenshot');
  console.log('-'.repeat(60));
  try {
    const url = `${VERCEL_URL}/api/puppeteer?url=${encodeURIComponent(testURL)}&action=screenshot&fullPage=true`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const filename = 'vercel-screenshot-full.png';
      fs.writeFileSync(filename, result.body);
      console.log(`   ✅ SUCCESS!`);
      console.log(`   📁 Saved: ${filename}`);
      console.log(`   📊 Size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`   ⏱️  Time: ${result.duration}s`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.statusCode}`);
      console.log(`   Response: ${result.body.toString()}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }
  
  // Test 3: PDF
  console.log('\n\n📄 TEST 3: PDF Generation');
  console.log('-'.repeat(60));
  try {
    const url = `${VERCEL_URL}/api/puppeteer?url=${encodeURIComponent(testURL)}&action=pdf`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const filename = 'vercel-page.pdf';
      fs.writeFileSync(filename, result.body);
      console.log(`   ✅ SUCCESS!`);
      console.log(`   📁 Saved: ${filename}`);
      console.log(`   📊 Size: ${(result.size / 1024).toFixed(2)} KB`);
      console.log(`   ⏱️  Time: ${result.duration}s`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.statusCode}`);
      console.log(`   Response: ${result.body.toString()}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }
  
  // Test 4: Content Extraction
  console.log('\n\n📝 TEST 4: Content Extraction');
  console.log('-'.repeat(60));
  try {
    const url = `${VERCEL_URL}/api/puppeteer?url=${encodeURIComponent(testURL)}&action=content`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body.toString());
      console.log(`   ✅ SUCCESS!`);
      console.log(`   📊 Extracted Data:`);
      console.log(JSON.stringify(data, null, 4));
      console.log(`   ⏱️  Time: ${result.duration}s`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.statusCode}`);
      console.log(`   Response: ${result.body.toString()}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }
  
  // Test 5: Different Website
  console.log('\n\n🌐 TEST 5: Different URL (GitHub)');
  console.log('-'.repeat(60));
  try {
    const githubURL = 'https://github.com';
    const url = `${VERCEL_URL}/api/puppeteer?url=${encodeURIComponent(githubURL)}&action=content`;
    const result = await makeRequest(url);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body.toString());
      console.log(`   ✅ SUCCESS!`);
      console.log(`   📊 Extracted Data:`);
      console.log(JSON.stringify(data, null, 4));
      console.log(`   ⏱️  Time: ${result.duration}s`);
      passedTests++;
    } else {
      console.log(`   ❌ FAILED - Status: ${result.statusCode}`);
      console.log(`   Response: ${result.body.toString()}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failedTests++;
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/5`);
  console.log(`❌ Failed: ${failedTests}/5`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Your API is working perfectly!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('\n📁 Generated Files:');
  console.log('   - vercel-screenshot.png');
  console.log('   - vercel-screenshot-full.png');
  console.log('   - vercel-page.pdf');
  console.log('\n');
}

// Run the tests
testDeployment().catch(error => {
  console.error('\n💥 Test failed:', error.message);
  process.exit(1);
});