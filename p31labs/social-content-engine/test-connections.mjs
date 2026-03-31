#!/usr/bin/env node

/**
 * P31 Social Content Engine - Test Connections
 * Verify API keys are working
 */

import { TwitterApi } from 'twitter-api-v2';

const TWITTER_ACCESS_TOKEN = '1998422276669423617-2na34S6hjLj5AlxjanmmuREDVZifOE';
const TWITTER_ACCESS_SECRET = 'p5OCtqj3nNiNjdOBQXlngGRnxMWDc0AjCRHTLq6Ohbwjh';
const TWITTER_APP_KEY = '4eIBkwZ4L3536MUDb0pqHxHIQ';
const TWITTER_APP_SECRET = '1vxehmYUPizqe9jHncup63B0MxvqmBxKWmTUuE5Ulwizra77RF';

async function testTwitter() {
  console.log('\n🐦 Testing Twitter/X Connection...\n');
  
  try {
    // Try with OAuth 1.0a (read-write)
    if (!TWITTER_ACCESS_TOKEN || !TWITTER_APP_KEY) {
      console.log('❌ Twitter not configured');
      return;
    }
    
    console.log('📋 Testing with OAuth 1.0a (read-write)...');
    const twitterClient = new TwitterApi({
      appKey: TWITTER_APP_KEY,
      appSecret: TWITTER_APP_SECRET,
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: TWITTER_ACCESS_SECRET
    });
    
    console.log('✅ Twitter client initialized');
    
    // Test tweet
    const testPost = await twitterClient.v2.tweet('🧪 P31 Social Content Engine test post - ignore');
    
    console.log('✅ Test tweet sent:', testPost.data.id);
    console.log('   https://twitter.com/i/status/' + testPost.data.id);
    
  } catch (error) {
    console.log('❌ Twitter test failed:', error.message);
    console.log('   Error code:', error.code || 'N/A');
  }
}

async function testAll() {
  console.log('═'.repeat(50));
  console.log('🔌 P31 SCE - Connection Tests');
  console.log('═'.repeat(50));
  
  await testTwitter();
  
  console.log('\n' + '═'.repeat(50));
  console.log('Tests complete');
  console.log('═'.repeat(50));
}

testAll();
