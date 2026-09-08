const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testStream() {
  const url = 'https://storm.vodvidl.site/proxy/file2/esgEnFWfGrwKvpfvzqKTlRg4UnDKaDh4tcEAZkYSk1k6wg9I~KLbUJ~Ch4BXACDYnCOi9lDwb~Nx1w6iL6s1~UFXUigmukiZOtEU+y9MwcQiyxZAN8mv10PYiCTIKGV6y3gq4utmhxrG1QaxokDBhfyJp39khUevMzDqzZ3dM3E=/MTA4MA==/aW5kZXgubTN1OA==.m3u8?headers=%7B%22origin%22%3A%22https%3A%2F%2Fvideostr.net%22%2C%22referer%22%3A%22https%3A%2F%2Fvideostr.net%2F%22%7D&host=https%3A%2F%2Fnightbreeze17.site';
  
  try {
    const res = await fetch(url, {
      headers: {
        'Referer': 'https://vidsrc.to/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      }
    });
    
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body (first 200 chars):', text.substring(0, 200));
  } catch (e) {
    console.log('Error:', e);
  }
}

testStream();
