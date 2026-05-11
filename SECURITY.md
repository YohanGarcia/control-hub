# Security Policy

## Supported versions

This project is currently pre-1.0. Security fixes are applied on the `main` branch.

## Reporting a vulnerability

Please do not open public issues for security vulnerabilities.

Report privately with:

- Summary and impact
- Steps to reproduce
- Affected component (`backend`, `agent`, `app_flutter`, `infra`)

Until a dedicated security email is configured, open a private GitHub security advisory in the repository.

## Secret handling guidelines

- Never commit `.env` files.
- Never commit device agent keys, JWT secrets, or access tokens.
- Rotate all credentials if accidental exposure happens.
