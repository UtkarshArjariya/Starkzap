Mar 14, 06:28 PM

Hey Utkarsh, Quick input needed :
The deploy script is running in the background (PID 9198), actively polling every 5 seconds. Here's the full status:

Status Update
✅ Fixed
Extension errors gone — TRPCClientError and Key ring is empty from Braavos/Argent X extensions are now silently suppressed. The error overlay won't appear anymore.
⏳ Waiting on You — One Action Needed
The new credentials you provided work perfectly (private key → public key match confirmed). The deploy script is running right now in the background, polling every 5 seconds for 30 minutes.

Please send at least 0.1 STRK to this OZ deployer address on Starknet Sepolia:

0x1a0d24240a41d0cbee5489d0d0503746282276f814da7cc611588d262789f8
(This is the deployer account computed from your private key 0x00e6d4c1...)

Once funds arrive, the script will automatically:

Deploy the OZ account
Declare the DareBoard contract class
Deploy DareBoard on Sepolia
Write the ABI to the frontend
Update REACT_APP_CONTRACT_ADDRESS in .env
After that, just let me know and I'll restart the frontend so the app exits demo mode and connects to the live contract.

Mar 14, 06:28 PM

Rollback

done sent

Mar 14, 06:32 PM

$ cat /tmp/deploy.log 2>/dev/null
Mar 14, 06:32 PM

$ # Check if process is still running ps aux | gre...
Mar 14, 06:33 PM

1 STRK detected and the process is still running. Let me check the log:

$ sleep 8 && cat /tmp/deploy.log
Mar 14, 06:33 PM

$ # Kill any stale deploy processes and restart fr...
Mar 14, 06:41 PM

$ cat /tmp/deploy.log 2>/dev/null
Mar 14, 06:41 PM

$ # Test the STRK balance check using the same RPC...
Mar 14, 06:42 PM

The selector format is wrong for starknet.js v7. Fix the waitForFunds to use the function name:

Edited
/app/contracts/scripts/deploy.ts
Mar 14, 06:42 PM

$ # Kill stale process, restart fresh pkill -f "ts...
Mar 14, 06:42 PM

Account deploying on-chain! Tx: 0x7577...754d. Let me watch it:

$ sleep 30 && cat /tmp/deploy.log
Mar 14, 06:43 PM

$ tail -30 /tmp/deploy.log
Mar 14, 06:43 PM

The error is a CASM hash mismatch — a known starknet.js v7 issue. Fix: let the node compile CASM itself by removing it from the declare call:

Edited
/app/contracts/scripts/deploy.ts
$ python3 -c " import json sierra = json.load(open...
Mar 14, 06:44 PM

$ python3 -c " import json sierra = json.load(open...
Mar 14, 06:44 PM

$ export PATH="$PATH:/root/.local/bin" # Try decla...
Mar 14, 06:44 PM

$ export PATH="$PATH:/root/.local/bin" # sncast us...
Mar 14, 06:44 PM

$ export PATH="$PATH:/root/.local/bin" sncast decl...
Mar 14, 06:44 PM

$ export PATH="$PATH:/root/.local/bin" sncast --he...
Mar 14, 06:45 PM

Created
/app/contracts/snfoundry.toml
Mar 14, 06:45 PM

The hash mismatch is a version compatibility issue between starknet.js v7 and Cairo 2.8.4's CASM format. Let me use sncast declare which handles this correctly, then deploy via starknet.js:

$ export PATH="$PATH:/root/.local/bin" # Add our O...
Mar 14, 06:45 PM

Edited
/app/contracts/snfoundry.toml
Mar 14, 06:45 PM

$ export PATH="$PATH:/root/.local/bin" cd /app/con...
Mar 14, 06:45 PM
