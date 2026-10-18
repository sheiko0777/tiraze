# Backup and restore verification

The repository provides AES-256-GCM encryption and authenticated offline SQLite restore verification. A synthetic round-trip, wrong-key and tampering test exists. This is not evidence of remote D1 recovery, independent account recovery, a 15-minute RPO or a 4-hour RTO.

1. Export the intended database using the pinned Wrangler D1 export command. Start with --local; remote exports require the operator's explicit approval and database verification. Keep plaintext exports outside Git in a restricted temporary location.
2. Supply BACKUP_KEY_HEX as a 32-byte random key through a secure environment/secret store. Keep it outside the backup account/storage; never paste it into chat or commit it.
3. Encrypt with node tools/backup.mjs encrypt input.sql output.tzb. The command refuses to overwrite an existing output file.
4. Verify with node tools/backup.mjs verify output.tzb. It authenticates the envelope and restores SQL in isolated in-memory SQLite; it never writes into the source D1.
5. Upload encrypted artifacts to a private independently controlled destination, retain an external copy and integrity/retention records, then securely remove the temporary plaintext according to the operator's workstation policy.
6. Rehearse restoration into a separate D1 environment and verify order counts, money totals, reservation/stock constraints and provider reconciliation. Keep jobs/mail off until already-completed effects have been reconciled.

Daily scheduling, private backup bucket permissions, off-account delivery, keys, alerting and a remote restore rehearsal remain launch gates. None was provisioned automatically. D1 provider recovery and daily exports cover different failure modes; a daily export alone cannot meet a 15-minute recovery point.
