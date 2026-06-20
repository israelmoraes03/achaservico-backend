#!/usr/bin/env python3
"""Remove old iOS provisioning profile - direct navigation"""
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

print("=== Removing iOS provisioning profile ===\n")
child = pexpect.spawn(
    'npx eas-cli credentials -p ios',
    env=env,
    timeout=180,
    encoding='utf-8',
    maxread=100000,
)
child.logfile = sys.stdout

try:
    # Step 1: Select build profile (preview-ios is 3rd - need 2 downs)
    child.expect('Which build profile', timeout=30)
    time.sleep(0.5)
    nav_down(child, 2)  # preview-ios
    child.sendline('')
    print("\n>>> Selected preview-ios")
    
    # Step 2: Select Team Type (Individual is 3rd - need 2 downs)
    child.expect('Select your Apple Team', timeout=30)
    time.sleep(0.5)
    nav_down(child, 2)  # Individual
    child.sendline('')
    print("\n>>> Selected Individual")
    
    # Step 3: Select "Build Credentials" (first option - no down needed)
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    # First option is "Build Credentials" - just press enter
    child.sendline('')
    print("\n>>> Selected Build Credentials")
    
    # Step 4: In Build Credentials menu, select "Provisioning Profile" 
    # Options: Distribution Certificate, Provisioning Profile, Go back
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    nav_down(child, 1)  # Provisioning Profile is 2nd
    child.sendline('')
    print("\n>>> Selected Provisioning Profile")
    
    # Step 5: In Provisioning Profile menu, select "Remove current"
    # Options: Set up, Update (re-download), Remove, Go back
    child.expect('What do you want to do', timeout=30)
    time.sleep(0.5)
    nav_down(child, 2)  # Remove is 3rd
    child.sendline('')
    print("\n>>> Selected Remove")
    
    # Step 6: Confirm removal
    idx = child.expect(['Are you sure', 'Y/n', 'y/N', 'removed', 'successfully'], timeout=30)
    if idx < 3:
        child.sendline('Y')
        print("\n>>> Confirmed")
        child.expect(['removed', 'successfully', 'deleted'], timeout=30)
    
    print("\n\n=== PROVISIONING PROFILE REMOVED SUCCESSFULLY! ===\n")
    
except pexpect.TIMEOUT as e:
    print(f"\n[TIMEOUT] Buffer: {child.before[-500:] if child.before else 'empty'}")
except pexpect.EOF as e:
    print(f"\n[EOF] Process ended")
except Exception as e:
    print(f"\n[ERROR] {e}")
finally:
    child.close()
    print(f"Exit code: {child.exitstatus}")
