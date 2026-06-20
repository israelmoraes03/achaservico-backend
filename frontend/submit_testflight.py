#!/usr/bin/env python3
"""Upload IPA to TestFlight via App Store Connect API"""
import pexpect
import os
import sys
import time

os.chdir('/app/frontend')

env = os.environ.copy()
env['EXPO_TOKEN'] = 'Y8Fn2kLKEO1T2GdiEAH-puXpe_VhBMRPdKKE2upR'
env['EXPO_ASC_API_KEY_PATH'] = '/app/frontend/AuthKey_M33RXKZJN9.p8'
env['EXPO_ASC_KEY_ID'] = 'M33RXKZJN9'
env['EXPO_ASC_ISSUER_ID'] = '017a6689-6907-4d98-8e92-3ea733e40f1c'
env['EXPO_APPLE_TEAM_ID'] = 'XC7JZ45JKY'

DOWN = '\x1b[B'

def nav_down(child, n):
    for _ in range(n):
        child.send(DOWN)
        time.sleep(0.2)

print("=== Uploading IPA to TestFlight ===\n")
child = pexpect.spawn(
    'npx eas-cli submit --platform ios --latest',
    env=env,
    timeout=300,
    encoding='utf-8',
    maxread=100000,
)
child.logfile = sys.stdout

try:
    # Wait for "Which build would you like to submit"
    idx = child.expect(['Which build', 'App Store Connect API Key', 'Select the submit profile', 'submitted!', pexpect.TIMEOUT], timeout=60)
    
    if idx == 0:  # Which build
        child.sendline('')  # Select latest
        idx = child.expect(['App Store Connect API Key', 'submitted!', pexpect.TIMEOUT], timeout=60)
    
    if idx == 2:  # Select submit profile
        child.sendline('')  # Select default
        idx = child.expect(['App Store Connect API Key', 'submitted!', pexpect.TIMEOUT], timeout=60)
    
    if idx == 0:  # App Store Connect API Key
        time.sleep(0.5)
        # First option should be to use existing or add new
        # Try selecting "Add new"
        child.sendline('')
        
        # It might ask for path
        idx2 = child.expect(['path', 'Key ID', 'Issuer ID', 'submitted!', pexpect.TIMEOUT], timeout=30)
        
        if 'path' in str(idx2) or idx2 == 0:
            child.sendline('/app/frontend/AuthKey_M33RXKZJN9.p8')
            child.expect(['Key ID', pexpect.TIMEOUT], timeout=30)
            child.sendline('M33RXKZJN9')
            child.expect(['Issuer ID', pexpect.TIMEOUT], timeout=30)
            child.sendline('017a6689-6907-4d98-8e92-3ea733e40f1c')
        
        # Wait for submission
        child.expect(['submitted!', 'Submitted', 'successfully', pexpect.TIMEOUT], timeout=180)
    
    print("\n\n=== UPLOAD COMPLETE! ===\n")
    
except pexpect.TIMEOUT as e:
    print(f"\n[TIMEOUT] Buffer: {child.before[-1000:] if child.before else 'empty'}")
except pexpect.EOF as e:
    print(f"\n[EOF] Process ended")
except Exception as e:
    print(f"\n[ERROR] {e}")
finally:
    child.close()
    print(f"Exit code: {child.exitstatus}")
