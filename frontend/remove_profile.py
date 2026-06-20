#!/usr/bin/env python3
"""Remove old iOS provisioning profile via EAS credentials"""
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
ENTER = '\r'

def nav_down(child, n):
    for _ in range(n):
        child.send(DOWN)
        time.sleep(0.2)

print("=== Removing iOS provisioning profile ===")
child = pexpect.spawn(
    'npx eas-cli credentials -p ios',
    env=env,
    timeout=120,
    encoding='utf-8',
    maxread=100000,
)
child.logfile = sys.stdout

try:
    # Step 1: Select build profile (preview-ios is 3rd option)
    child.expect('Which build profile', timeout=30)
    time.sleep(0.5)
    nav_down(child, 2)  # Go to preview-ios
    child.sendline('')
    print("\n>>> Selected preview-ios profile")
    
    # Step 2: Select "Build Credentials" (usually first option)
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    child.sendline('')  # Select first option
    print("\n>>> Selected Build Credentials")
    
    # Step 3: Select "Provisioning Profile" option
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    nav_down(child, 1)  # Go to Provisioning Profile
    child.sendline('')
    print("\n>>> Selected Provisioning Profile")
    
    # Step 4: Select "Remove current" option
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    nav_down(child, 1)  # Go to Remove
    child.sendline('')
    print("\n>>> Selected Remove")
    
    # Step 5: Confirm removal
    idx = child.expect(['Are you sure', 'Y/n', 'y/N', 'successfully'], timeout=30)
    if idx < 3:
        child.sendline('Y')
        print("\n>>> Confirmed removal")
        child.expect(['successfully', 'removed', 'deleted'], timeout=30)
    
    print("\n\n=== PROVISIONING PROFILE REMOVED! ===")
    
except pexpect.TIMEOUT as e:
    print(f"\n[TIMEOUT] Current buffer: {child.before}")
except pexpect.EOF as e:
    print(f"\n[EOF] Process ended: {child.before}")
except Exception as e:
    print(f"\n[ERROR] {e}")
finally:
    child.close()
    print(f"\nExit code: {child.exitstatus}")
