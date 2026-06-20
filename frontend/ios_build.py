#!/usr/bin/env python3
import pexpect
import os
import sys

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
            r'\?.*\(Y/n\)',          # Y/n question
            r'\?.*\(y/N\)',          # y/N question
            r'›.*Generate new',      # Generate new option
            r'›.*Create',            # Create option
            r'Would you like',       # Would you like...
            r'Do you want',          # Do you want...
            r'Select.*team',         # Select team
            r'Log in',               # Log in prompt
            r'Which.*would',         # Which would you like
            pexpect.EOF,
            pexpect.TIMEOUT,
        ], timeout=120)
        
        if index == 0:  # Y/n
            child.sendline('Y')
        elif index == 1:  # y/N
            child.sendline('y')
        elif index == 2:  # Generate new
            child.sendline('')
        elif index == 3:  # Create
            child.sendline('')
        elif index == 4:  # Would you like
            child.sendline('y')
        elif index == 5:  # Do you want
            child.sendline('y')
        elif index == 6:  # Select team
            child.sendline('')
        elif index == 7:  # Log in
            child.sendline('')
        elif index == 8:  # Which would
            child.sendline('')
        elif index == 9:  # EOF
            print("\n=== BUILD PROCESS COMPLETED ===")
            break
        elif index == 10:  # TIMEOUT
            print("\n=== TIMEOUT - checking status ===")
            break
    except pexpect.exceptions.EOF:
        print("\n=== PROCESS ENDED ===")
        break
    except Exception as e:
        print(f"\n=== ERROR: {e} ===")
        break

child.close()
print(f"\nExit code: {child.exitstatus}")
