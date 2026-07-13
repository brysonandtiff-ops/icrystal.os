# Local-only verification policy

GitHub Actions is intentionally not used in this repository.

- Do not add `.yml` or `.yaml` workflow files to this directory.
- Run the repository's lint, test, build, security, and release checks on a developer machine before pushing.
- Start deployments manually from local tooling or the hosting provider, never from GitHub Actions.
- Keep evidence and logs local unless they are intentionally reviewed and committed.

This owner policy applies to every repository under `brysonandtiff-ops`.
