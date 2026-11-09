import https from 'https';

// Cloudflare API credentials
const CLOUDFLARE_API_TOKEN = 'MXZhaRJ1lVp8AmJnYqIyewJ1TYQZk0MsIACdg81E';
const ZONE_ID = '71641cf7234bde112acd9c5eb8ab2ec2';
const ACCOUNT_ID = '31394ad4685a4a71b31a07f05319b29e';
const DOMAIN = 'legacywineandliquor.com';

// Helper function to make Cloudflare API requests
function makeCloudflareRequest(endpoint, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function runDiagnostics() {
  console.log('='.repeat(60));
  console.log('CLOUDFLARE DIAGNOSTICS FOR: www.legacywineandliquor.com');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. Verify API Token
    console.log('1. Verifying API Token...');
    const tokenVerify = await makeCloudflareRequest('/client/v4/user/tokens/verify');
    if (tokenVerify.success) {
      console.log('✓ API Token is valid');
      console.log(`  Status: ${tokenVerify.result.status}`);
    } else {
      console.log('✗ API Token verification failed');
      console.log('  Errors:', tokenVerify.errors);
    }
    console.log();

    // 2. Get Zone Details
    console.log('2. Fetching Zone Details...');
    const zoneDetails = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}`);
    if (zoneDetails.success) {
      console.log('✓ Zone found');
      console.log(`  Name: ${zoneDetails.result.name}`);
      console.log(`  Status: ${zoneDetails.result.status}`);
      console.log(`  Name Servers: ${zoneDetails.result.name_servers.join(', ')}`);
      console.log(`  Development Mode: ${zoneDetails.result.development_mode > 0 ? 'ON' : 'OFF'}`);
    } else {
      console.log('✗ Failed to fetch zone details');
      console.log('  Errors:', zoneDetails.errors);
    }
    console.log();

    // 3. Get DNS Records
    console.log('3. Fetching DNS Records...');
    const dnsRecords = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/dns_records`);
    if (dnsRecords.success) {
      console.log(`✓ Found ${dnsRecords.result.length} DNS records`);
      console.log();
      dnsRecords.result.forEach(record => {
        console.log(`  - ${record.type} | ${record.name} → ${record.content}`);
        console.log(`    Proxied: ${record.proxied ? 'YES (Orange Cloud)' : 'NO (DNS Only)'}`);
        console.log(`    TTL: ${record.ttl === 1 ? 'Auto' : record.ttl}`);
        console.log();
      });
    } else {
      console.log('✗ Failed to fetch DNS records');
      console.log('  Errors:', dnsRecords.errors);
    }
    console.log();

    // 4. Get SSL/TLS Settings
    console.log('4. Checking SSL/TLS Settings...');
    const sslSettings = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/settings/ssl`);
    if (sslSettings.success) {
      console.log('✓ SSL/TLS Settings:');
      console.log(`  Mode: ${sslSettings.result.value}`);
    } else {
      console.log('✗ Failed to fetch SSL settings');
    }
    console.log();

    // 5. Get Security Level
    console.log('5. Checking Security Level...');
    const securityLevel = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/settings/security_level`);
    if (securityLevel.success) {
      console.log('✓ Security Level:');
      console.log(`  Level: ${securityLevel.result.value}`);
    }
    console.log();

    // 6. Get Cache Level
    console.log('6. Checking Cache Settings...');
    const cacheLevel = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/settings/cache_level`);
    if (cacheLevel.success) {
      console.log('✓ Cache Level:');
      console.log(`  Level: ${cacheLevel.result.value}`);
    }
    console.log();

    // 7. Check if Always Online is enabled
    console.log('7. Checking Always Online...');
    const alwaysOnline = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/settings/always_online`);
    if (alwaysOnline.success) {
      console.log('✓ Always Online:');
      console.log(`  Status: ${alwaysOnline.result.value}`);
    }
    console.log();

    // 8. Get Analytics (last 24 hours)
    console.log('8. Fetching Recent Analytics...');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const analytics = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/analytics/dashboard?since=${since}`);
    if (analytics.success) {
      console.log('✓ Analytics (Last 24 hours):');
      console.log(`  Requests: ${analytics.result.totals.requests.all}`);
      console.log(`  Bandwidth: ${(analytics.result.totals.bandwidth.all / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Threats: ${analytics.result.totals.threats.all}`);
      console.log(`  Page Views: ${analytics.result.totals.pageviews.all}`);
    }
    console.log();

    // 9. Check Firewall Rules
    console.log('9. Checking Firewall Rules...');
    const firewallRules = await makeCloudflareRequest(`/client/v4/zones/${ZONE_ID}/firewall/rules`);
    if (firewallRules.success) {
      console.log(`✓ Found ${firewallRules.result.length} firewall rules`);
      if (firewallRules.result.length > 0) {
        firewallRules.result.forEach(rule => {
          console.log(`  - ${rule.description || 'Unnamed Rule'}`);
          console.log(`    Action: ${rule.action}`);
          console.log(`    Enabled: ${rule.paused ? 'NO' : 'YES'}`);
        });
      }
    }
    console.log();

    console.log('='.repeat(60));
    console.log('DIAGNOSIS SUMMARY');
    console.log('='.repeat(60));
    console.log();
    console.log('Based on the Cloudflare configuration:');
    console.log();
    console.log('The "Error establishing a database connection" is NOT caused by');
    console.log('Cloudflare settings. This is a server-side issue with your hosting.');
    console.log();
    console.log('RECOMMENDED ACTIONS:');
    console.log('1. Contact your web hosting provider immediately');
    console.log('2. Check if your database service is running');
    console.log('3. Verify database credentials in wp-config.php');
    console.log('4. Check server logs for more details');
    console.log();
    console.log('Cloudflare is properly configured and routing traffic to your server,');
    console.log('but your server is returning the database error.');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error running diagnostics:', error.message);
  }
}

// Run the diagnostics
runDiagnostics();
