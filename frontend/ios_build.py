#!/usr/bin/env python3
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
env['EXPO_APPLE_TEAM_TYPE'] = 'INDIVIDUAL'

print("=== Starting iOS build (capabilities removed) ===")
child = pexpect.spawn(
    'npx eas-cli build --platform ios --profile preview-ios --no-wait',
    env=env,
    timeout=300,
    encoding='utf-8',
    maxread=10000,
)
child.logfile = sys.stdout

while True:
    try:
        index = child.expect([
            r'Would you like to set up Push',  # Push
            r'Generate a new Apple Provisioning',  # New prov profile
            r'Generate a new Apple Distribution',  # New dist cert
            r'\(Y/n\)',
            r'\(y/N\)',
            r'Use arrow-keys',
            r'Apple ID:',
            r'Password',
            r'expo\.dev.*builds',  # Build URL
            pexpect.EOF,
            pexpect.TIMEOUT,
        ], timeout=120)
        
        if index == 0:  # Push notifications
            time.sleep(0.5)
            child.send('\x1b[B')  # Down to No
            time.sleep(0.3)
            child.sendline('')
        elif index == 1:  # New prov profile
            child.sendline('Y')
        elif index == 2:  # New dist cert
            child.sendline('Y')
        elif index == 3:  # Y/n
            child.sendline('Y')
        elif index == 4:  # y/N
            child.sendline('y')
        elif index == 5:  # Arrow menu
            time.sleep(0.3)
            child.sendline('')
        elif index == 6:  # Apple ID
            child.sendcontrol('c')
            break
        elif index == 7:  # Password
            child.sendcontrol('c')
            break
        elif index == 8:  # Build URL shown
            time.sleep(2)
        elif index == 9:  # EOF
            print("\n=== BUILD COMPLETED ===")
            break
        elif index == 10:  # TIMEOUT
            print("\n=== TIMEOUT ===")
            break
    except pexpect.exceptions.EOF:
        print("\n=== PROCESS ENDED ===")
        break
    except Exception as e:
        print(f"\n=== ERROR: {e} ===")
        break

child.close()
print(f"\nExit code: {child.exitstatus}")
