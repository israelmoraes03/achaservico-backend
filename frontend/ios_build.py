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
            r'Push Notifications.*project',  # Push notification question
            r'Generate a new Apple Distribution',  # Generate dist cert
            r'Generate a new Apple Provisioning',  # Generate prov profile
            r'\(Y/n\)',          # Y/n question
            r'\(y/N\)',          # y/N question  
            r'Would you like to set up Push',  # Push notification setup
            r'don\'t ask again',  # option with don't ask again
            r'Apple ID:',  # Apple ID prompt - skip
            r'Password',  # Password prompt - skip
            pexpect.EOF,
            pexpect.TIMEOUT,
        ], timeout=120)
        
        if index == 0:  # Push notifications question
            # Select "No, don't ask again"
            time.sleep(0.5)
            child.send('\x1b[B')  # Arrow down
            time.sleep(0.3)
            child.send('\x1b[B')  # Arrow down again to "No, don't ask again"
            time.sleep(0.3)
            child.sendline('')
        elif index == 1:  # Generate dist cert
            child.sendline('Y')
        elif index == 2:  # Generate prov profile
            child.sendline('Y')
        elif index == 3:  # Y/n
            child.sendline('Y')
        elif index == 4:  # y/N
            child.sendline('y')
        elif index == 5:  # Would you like push
            time.sleep(0.5)
            child.send('\x1b[B')  # Arrow down to No
            time.sleep(0.3)
            child.sendline('')
        elif index == 6:  # don't ask again visible
            child.sendline('')
        elif index == 7:  # Apple ID prompt
            child.sendcontrol('c')
            break
        elif index == 8:  # Password prompt
            child.sendcontrol('c')
            break
        elif index == 9:  # EOF
            print("\n=== BUILD PROCESS COMPLETED ===")
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
