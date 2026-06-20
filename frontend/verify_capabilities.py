#!/usr/bin/env python3
"""
Verify and ensure capabilities are properly set on Bundle ID
"""
import jwt
import time
import requests
import json

# Apple credentials
ISSUER_ID = '017a6689-6907-4d98-8e92-3ea733e40f1c'
KEY_ID = 'M33RXKZJN9'
BUNDLE_ID_INTERNAL = '7WBL72XU99'  # From previous script

# Read the private key
with open('/app/frontend/AuthKey_M33RXKZJN9.p8', 'r') as f:
    private_key = f.read()

# Generate JWT token
now = int(time.time())
payload = {
    'iss': ISSUER_ID,
    'iat': now,
    'exp': now + 1200,
    'aud': 'appstoreconnect-v1'
}

token = jwt.encode(payload, private_key, algorithm='ES256', headers={'kid': KEY_ID})

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Get ALL capabilities including details
print("=== Checking ALL capabilities on Bundle ID ===\n")
response = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/bundleIds/{BUNDLE_ID_INTERNAL}/bundleIdCapabilities',
    headers=headers
)

if response.status_code == 200:
    capabilities = response.json().get('data', [])
    print("Current capabilities:")
    for cap in capabilities:
        cap_id = cap['id']
        cap_type = cap['attributes'].get('capabilityType', 'Unknown')
        print(f"  ✓ {cap_type} (ID: {cap_id})")
    
    cap_types = [c['attributes'].get('capabilityType') for c in capabilities]
    
    # Check for missing capabilities
    missing = []
    if 'PUSH_NOTIFICATIONS' not in cap_types:
        missing.append('PUSH_NOTIFICATIONS')
    if 'APPLE_ID_AUTH' not in cap_types:
        missing.append('APPLE_ID_AUTH')
    
    if missing:
        print(f"\n⚠️  Missing capabilities: {missing}")
        for cap in missing:
            print(f"\nAdding {cap}...")
            payload = {
                'data': {
                    'type': 'bundleIdCapabilities',
                    'attributes': {
                        'capabilityType': cap,
                        'settings': []
                    },
                    'relationships': {
                        'bundleId': {
                            'data': {
                                'type': 'bundleIds',
                                'id': BUNDLE_ID_INTERNAL
                            }
                        }
                    }
                }
            }
            resp = requests.post(
                'https://api.appstoreconnect.apple.com/v1/bundleIdCapabilities',
                headers=headers,
                json=payload
            )
            if resp.status_code in [200, 201]:
                print(f"  ✅ {cap} added!")
            else:
                print(f"  ❌ Failed: {resp.status_code} - {resp.text[:200]}")
    else:
        print("\n✅ All required capabilities are present!")
else:
    print(f"Error: {response.status_code}")
    print(response.text)
