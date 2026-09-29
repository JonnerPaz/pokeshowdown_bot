# Security Policy

## Supported Versions

We release patches and security fixes for the active `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| < 1.1   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within **PokeBotShowdown**, please do **not** disclose it publicly via GitHub Issues.

Instead, please report the vulnerability privately by opening a [GitHub Security Advisory](https://github.com/JonnerPaz/pokeshowdown_bot/security/advisories/new) or by contacting the project maintainer directly.

### What to Include in Your Report

- A detailed description of the vulnerability.
- Steps to reproduce or a minimal proof of concept.
- Potential impact (e.g. unauthorized data access, webhook bypass, denial of service).
- Any suggestions for mitigation.

You can expect an initial acknowledgment within 48 hours and regular updates as the issue is resolved.

---

## Credential Safety Guidelines

- **Never commit `.env` files**: All secrets (`API_KEY`, `DATABASE_URL`, `WEBHOOK_SECRET`) must remain in your local environment.
- **Webhook Token Verification**: Webhook requests from Telegram must be validated against `X-Telegram-Bot-Api-Secret-Token` via `WEBHOOK_SECRET`.
- **Database Sanitization**: Do not expose database connection strings in logs or pull requests.
