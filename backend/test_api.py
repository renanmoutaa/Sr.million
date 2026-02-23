import urllib.request
import json

req = urllib.request.Request(
    'https://sr-million-l1ix.vercel.app/api/chat', 
    data=json.dumps({'message': 'oi'}).encode('utf-8'), 
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as res:
        print(res.read())
except Exception as e:
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
    else:
        print(str(e))
