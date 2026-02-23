import urllib.request
import json

print("=== Testing Frontend ===")
try:
    with urllib.request.urlopen('https://sr-million-l1ix.vercel.app/', timeout=15) as r:
        body = r.read().decode('utf-8')
        if '<!doctype' in body.lower() or '<html' in body.lower() or '<head' in body.lower():
            print(f"OK {r.status}: HTML page served correctly (length: {len(body)} chars)")
        else:
            print(f"Unexpected response {r.status}: {body[:300]}")
except Exception as e:
    code = getattr(e, 'code', '?')
    body = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
    print(f"ERROR {code}: {body[:500]}")

print("\n=== Testing API ===")
try:
    req = urllib.request.Request(
        'https://sr-million-l1ix.vercel.app/api/chat',
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
