async function test() {
  const url = 'http://localhost:3000/logo-og.png';
  try {
    const response = await fetch(url);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
