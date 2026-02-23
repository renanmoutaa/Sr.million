import urllib.request
import json
import time

url = 'https://sr-million-l1ix.vercel.app/api/chat'
print(f"Testing: {url}")

req = urllib.request.Request(
    url,
    data=json.dumps({'message': 'oi'}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req, timeout=30) as res:
        body = res.read().decode('utf-8')
        print(f"SUCCESS ({res.status}):")
        print(body[:500])
except Exception as e:
    if hasattr(e, 'read'):
        body = e.read().decode('utf-8')
        print(f"ERROR ({e.code}):")
        print(body[:1000])
    else:
        print(f"EXCEPTION: {e}")
