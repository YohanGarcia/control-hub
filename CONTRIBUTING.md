# Contributing to Control Hub

Thanks for your interest in contributing.

## How to contribute

1. Fork the repository.
2. Create a branch from `main`:
   - `feat/<short-description>` for features
   - `fix/<short-description>` for bug fixes
3. Keep changes focused and small.
4. Add or update tests when behavior changes.
5. Open a Pull Request with context and screenshots for UI changes.

## Development checks

- Backend: run tests in `backend/`.
- Flutter: run `flutter analyze` and `flutter test` in `app_flutter/`.
- Agent: run smoke checks in `agent/` with a local backend.

## Pull request checklist

- [ ] No secrets or tokens in code, logs, or screenshots
- [ ] Docs updated when behavior/config changed
- [ ] Backward compatibility considered for API and agent handshake
- [ ] Local checks pass

## Issue labels

- `good first issue` for onboarding
- `bug` for defects
- `enhancement` for improvements
- `security` for sensitive fixes
