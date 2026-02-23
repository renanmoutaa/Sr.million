import urllib.request
import json

endpoints = [
    ('GET', 'https://sr-million-l1ix.vercel.app/api/health'),
    ('POST', 'https://sr-million-l1ix.vercel.app/api/chat'),
]

for method, url in endpoints:
    print(f"\n--- {method} {url} ---")
    try:
        if method == 'POST':
            req = urllib.request.Request(
                url,
                data=json.dumps({'message': 'oi'}).encode(),
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
        else:
            req = urllib.request.Request(url, method='GET')
        
        with urllib.request.urlopen(req, timeout=30) as res:
            body = res.read().decode('utf-8')
            print(f"OK {res.status}: {body[:500]}")
    except Exception as e:
        if hasattr(e, 'read'):
            body = e.read().decode('utf-8')
            print(f"HTTP {getattr(e, 'code', '?')}: {body[:800]}")
        else:
            print(f"ERROR: {e}")
