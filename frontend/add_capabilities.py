#!/usr/bin/env python3
"""
Add Push Notifications and Sign in with Apple capabilities to the Bundle ID
via App Store Connect API
"""
import jwt
import time
import requests
import json

# Apple credentials
ISSUER_ID = '017a6689-6907-4d98-8e92-3ea733e40f1c'
KEY_ID = 'M33RXKZJN9'
TEAM_ID = 'XC7JZ45JKY'
BUNDLE_ID = 'com.achaservico.app'

# Read the private key
with open('/app/frontend/AuthKey_M33RXKZJN9.p8', 'r') as f:
    private_key = f.read()

# Generate JWT token
now = int(time.time())
payload = {
    'iss': ISSUER_ID,
    'iat': now,
    'exp': now + 1200,  # 20 minutes
    'aud': 'appstoreconnect-v1'
}

token = jwt.encode(payload, private_key, algorithm='ES256', headers={'kid': KEY_ID})
print(f"JWT Token generated successfully")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Step 1: Find the Bundle ID
print(f"\n=== Finding Bundle ID: {BUNDLE_ID} ===")
response = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/bundleIds?filter[identifier]={BUNDLE_ID}',
    headers=headers
)

if response.status_code != 200:
    print(f"Error fetching bundle IDs: {response.status_code}")
    print(response.text)
    exit(1)

data = response.json()
if not data.get('data'):
    print(f"Bundle ID {BUNDLE_ID} not found!")
    exit(1)

bundle_id_data = data['data'][0]
bundle_id_id = bundle_id_data['id']
print(f"Found Bundle ID: {bundle_id_id}")

# Step 2: Get current capabilities
print(f"\n=== Current Capabilities ===")
response = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/bundleIds/{bundle_id_id}/bundleIdCapabilities',
    headers=headers
)

if response.status_code == 200:
    capabilities = response.json().get('data', [])
    for cap in capabilities:
        cap_type = cap['attributes'].get('capabilityType', 'Unknown')
        print(f"  - {cap_type}")
else:
    print(f"Could not fetch capabilities: {response.status_code}")

# Step 3: Add Push Notifications capability
print(f"\n=== Adding Push Notifications capability ===")
push_payload = {
    'data': {
        'type': 'bundleIdCapabilities',
        'attributes': {
            'capabilityType': 'PUSH_NOTIFICATIONS',
            'settings': []
        },
        'relationships': {
            'bundleId': {
                'data': {
                    'type': 'bundleIds',
                    'id': bundle_id_id
                }
            }
        }
    }
}

response = requests.post(
    'https://api.appstoreconnect.apple.com/v1/bundleIdCapabilities',
    headers=headers,
    json=push_payload
)

if response.status_code in [201, 200]:
    print("✅ Push Notifications capability added!")
elif response.status_code == 409:
    print("ℹ️  Push Notifications capability already exists")
else:
    print(f"⚠️  Push Notifications: {response.status_code}")
    print(response.text[:500])

# Step 4: Add Sign in with Apple capability
print(f"\n=== Adding Sign in with Apple capability ===")
apple_signin_payload = {
    'data': {
        'type': 'bundleIdCapabilities',
        'attributes': {
            'capabilityType': 'APPLE_ID_AUTH',
            'settings': []
        },
        'relationships': {
            'bundleId': {
                'data': {
                    'type': 'bundleIds',
                    'id': bundle_id_id
                }
            }
        }
    }
}

response = requests.post(
    'https://api.appstoreconnect.apple.com/v1/bundleIdCapabilities',
    headers=headers,
    json=apple_signin_payload
)

if response.status_code in [201, 200]:
    print("✅ Sign in with Apple capability added!")
elif response.status_code == 409:
    print("ℹ️  Sign in with Apple capability already exists")
else:
    print(f"⚠️  Sign in with Apple: {response.status_code}")
    print(response.text[:500])

# Step 5: Verify final capabilities
print(f"\n=== Final Capabilities ===")
response = requests.get(
    f'https://api.appstoreconnect.apple.com/v1/bundleIds/{bundle_id_id}/bundleIdCapabilities',
    headers=headers
)

if response.status_code == 200:
    capabilities = response.json().get('data', [])
    for cap in capabilities:
        cap_type = cap['attributes'].get('capabilityType', 'Unknown')
        print(f"  - {cap_type}")
else:
    print(f"Could not verify: {response.status_code}")

print("\n=== Done! Now regenerate the provisioning profile and rebuild. ===")
