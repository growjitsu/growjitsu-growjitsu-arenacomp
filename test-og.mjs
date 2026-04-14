
async function test() {
  const url = 'http://localhost:3000/';
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WhatsApp/2.21.12.21 A'
      }
    });
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('HTML Start:', text.substring(0, 2000));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
