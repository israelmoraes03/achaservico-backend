#!/usr/bin/env python3
"""Delete old provisioning profile via Build Credentials menu"""
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
        time.sleep(0.15)

print("=== Managing iOS credentials ===")
child = pexpect.spawn(
    'npx eas-cli credentials -p ios',
    env=env,
    timeout=180,
    encoding='utf-8',
    maxread=100000,
)
child.logfile = sys.stdout

state = 'profile_select'
max_rounds = 25

for round_num in range(1, max_rounds + 1):
    try:
        idx = child.expect([
            r'Which build profile',         # 0
            r'Select your Apple Team',      # 1
            r'What do you want to do',      # 2
            r'Are you sure',               # 3
            r'\(Y/n\)',                    # 4
            r'\(y/N\)',                    # 5
            r'successfully removed',        # 6
            r'successfully deleted',        # 7
            r'Apple ID:',                  # 8
            r'Password',                   # 9
            pexpect.EOF,                   # 10
            pexpect.TIMEOUT,               # 11
        ], timeout=25)
        
        print(f"\n[R{round_num} state={state} match={idx}]")
        
        if idx == 0:  # Build profile
            time.sleep(0.3)
            nav_down(child, 2)  # to preview-ios
            child.sendline('')
            
        elif idx == 1:  # Team type
            time.sleep(0.3)
            nav_down(child, 2)  # to Individual
            child.sendline('')
            
        elif idx == 2:  # What do you want to do
            time.sleep(0.5)
            if state == 'profile_select':
                # First menu: select "Build Credentials" (1st option - no arrows needed)
                child.sendline('')  # Select first option
                state = 'build_creds'
            elif state == 'build_creds':
                # Build Credentials submenu - options are usually:
                # 1. Distribution Certificate: Use existing / set up
                # 2. Provisioning Profile: Update / Remove
                # We need "Provisioning Profile" related option
                # Go down 1 to Provisioning Profile
                nav_down(child, 1)
                child.sendline('')
                state = 'prov_profile'
            elif state == 'prov_profile':
                # Provisioning Profile submenu - find "Remove"
                # Options might be: Update, Remove, Go back
                # Go down to Remove
                nav_down(child, 1)
                child.sendline('')
                state = 'removing'
            elif state == 'removing':
                # We might be back at another menu
                nav_down(child, 1)
                child.sendline('')
            else:
                child.sendline('')
                
        elif idx == 3:  # Are you sure
            child.sendline('Y')
            
        elif idx == 4:  # Y/n
            child.sendline('Y')
            
        elif idx == 5:  # y/N
            child.sendline('y')
            
        elif idx in [6, 7]:  # Success
            print("\n\n=== PROVISIONING PROFILE DELETED! ===\n")
            child.sendcontrol('c')
            break
            
        elif idx in [8, 9]:  # Apple auth - abort
            print("\n=== Apple ID required - aborting ===")
            child.sendcontrol('c')
            break
            
        elif idx == 10:  # EOF
            break
            
        elif idx == 11:  # TIMEOUT
            print(f"\n[Timeout at R{round_num}]")
            child.sendcontrol('c')
            break
            
    except pexpect.exceptions.EOF:
        break
    except Exception as e:
        print(f"\n[Error: {e}]")
        break

child.close()
print(f"\nExit: {child.exitstatus}")
