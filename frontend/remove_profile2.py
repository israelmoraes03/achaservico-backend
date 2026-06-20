#!/usr/bin/env python3
"""Remove old iOS provisioning profile via EAS credentials - improved version"""
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

print("=== Removing iOS provisioning profile ===")
child = pexpect.spawn(
    'npx eas-cli credentials -p ios',
    env=env,
    timeout=180,
    encoding='utf-8',
    maxread=100000,
)
child.logfile = sys.stdout

max_steps = 20
for step in range(max_steps):
    try:
        idx = child.expect([
            r'Which build profile',           # 0
            r'Select your Apple Team',        # 1
            r'What do you want to do',        # 2
            r'Are you sure',                  # 3
            r'\(Y/n\)',                       # 4
            r'\(y/N\)',                       # 5
            r'successfully',                  # 6
            r'removed',                       # 7
            r'deleted',                       # 8
            pexpect.EOF,                      # 9
            pexpect.TIMEOUT,                  # 10
        ], timeout=30)
        
        print(f"\n[Step {step+1} match={idx}]")
        
        if idx == 0:  # Build profile
            time.sleep(0.3)
            nav_down(child, 2)  # preview-ios
            child.sendline('')
            
        elif idx == 1:  # Team type
            time.sleep(0.3)
            nav_down(child, 2)  # Individual
            child.sendline('')
            
        elif idx == 2:  # What do you want to do
            time.sleep(0.3)
            # We need to navigate to find "Remove" or "Provisioning Profile"
            # Send some downs and try
            nav_down(child, 1)
            child.sendline('')
            
        elif idx == 3:  # Are you sure
            child.sendline('Y')
            
        elif idx == 4:  # Y/n
            child.sendline('Y')
            
        elif idx == 5:  # y/N
            child.sendline('y')
            
        elif idx in [6, 7, 8]:  # Success
            print("\n\n=== OPERATION SUCCESSFUL! ===")
            break
            
        elif idx == 9:  # EOF
            print("\n[Process ended]")
            break
            
        elif idx == 10:  # TIMEOUT
            print(f"\n[Timeout at step {step+1}]")
            break
            
    except Exception as e:
        print(f"\n[Error at step {step+1}]: {e}")
        break

child.close()
print(f"\nExit code: {child.exitstatus}")
