# Security Policy

## Supported version

Security fixes are made on the latest `main` branch.

## Reporting a vulnerability

Do **not** open a public GitHub issue for a suspected vulnerability or any finding involving credentials, payment data, customer data, or a path to exploit.

Use GitHub's private vulnerability reporting feature for this repository:

<https://github.com/longnick/small-pos-open-source/security/advisories/new>

Include:

- affected commit or file;
- minimal reproduction steps;
- impact and preconditions;
- any suggested remediation.

Please redact secrets and personal data. Maintainers will acknowledge valid reports and coordinate disclosure after a fix is available.

## Security boundaries today

This is a local-first starter. It has no production backend, payment gateway, cloud sync, or real-user authentication. Do not deploy it as an authentication or payment system.

- Manager PIN is exactly four digits, hashed in the browser with Web Crypto PBKDF2, and checked only on this device.
- Login is throttled in memory: five attempts per staff id per 60 seconds. Reload clears the counter.
- Backup JSON is version 2 only for product restore. It contains `staff.pinHash`. Treat the file as a local secret. Version-1 backups are rejected before any write.

## Automated checks

`npm run scan:leakage` rejects known tenant/config/credential markers from source inputs. It is a defense-in-depth check, not a substitute for secret scanning, review, or secure deployment design.
