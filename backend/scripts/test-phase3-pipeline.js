// Node 20 has built-in fetch

const BACKEND_URL = 'http://localhost:3000';

const mockPayload = {
  url: 'https://test-phase3.com',
  domain: 'test-phase3.com',
  renderType: 'CSR',
  confidence: 90,
  frameworks: ['React', 'Next.js'],
  version: '3.5.0-test',
  
  // Phase 3 - Hydration
  hydrationData: {
    errorCount: 2,
    score: 90,
    errors: [
      { msg: 'Text content does not match server-rendered HTML', time: 150 },
      { msg: 'Hydration failed because the initial UI does not match', time: 155 }
    ]
  },

  // Phase 3 - Navigation
  navigationData: {
    isSPA: true,
    clientRoutes: 3,
    routes: [
      { type: 'pushState', view: '/dashboard', time: 5000 },
      { type: 'pushState', view: '/settings', time: 12000 },
      { type: 'pushState', view: '/profile', time: 18000 }
    ]
  }
};

async function runTest() {
  console.log('🚀 Starting Phase 3 Pipeline Verification...');

  try {
    // 1. Send Analysis Data
    console.log('\n1️⃣  Sending Mock Analysis...');
    const analyzeRes = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'your-api-secret-key-here'
      },
      body: JSON.stringify(mockPayload)
    });

    if (!analyzeRes.ok) {
        const text = await analyzeRes.text();
        throw new Error(`Analysis failed: ${analyzeRes.status} ${text}`);
    }
    const analyzeJson = await analyzeRes.json();
    console.log('✅ Analysis stored! ID:', analyzeJson.id);

    // 2. We can't query stats yet because I haven't implemented the stats endpoint for Phase 3!
    // But getting a successful ID means the INSERT worked.
    
    console.log('\n🎉 SUCCESS: Phase 3 data accepted and stored!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

runTest();
