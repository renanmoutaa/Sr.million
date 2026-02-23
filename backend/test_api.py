import urllib.request
import json

print("\n=== Testing API (Localhost) ===")
try:
    req = urllib.request.Request(
        'http://localhost/api/chat',
        data=json.dumps({'message': 'oi'}).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode('utf-8')
        print(f"OK {r.status}: {body[:200]}")
except Exception as e:
    code = getattr(e, 'code', '?')
    body = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
    print(f"ERROR {code}: {body[:500]}")
