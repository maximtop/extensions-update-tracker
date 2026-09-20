# Development

## Shared developer commands

| Make | pnpm | Meaning |
| --- | --- | --- |
| `make install` | `pnpm install` | Install dependencies; `make setup` and `make init` are aliases. |
| `make build [browser]` | `pnpm build [browser]` | Build once in development mode; Chrome by default. |
| `make dev [browser]` | `pnpm dev [browser]` | Alias for the one-shot development build. |
| `make start [browser]` | `pnpm start [browser]` | Watch development files; Chrome by default. |
| `make release [browser]` | `pnpm release [browser]` | Build local production archives; all store targets by default. |
| `make package [browser]` | `pnpm package [browser]` | Alias for local release packaging. |
| `make check` | `pnpm check` | Static checks and automated tests, without store submission. |

`make` defaults to `make build`. Pass at most one supported browser as an
extra goal, for example `make build firefox`. Unknown targets fail before
building. `lint`, `typecheck`, and `test` also have matching Make targets;
`make validate` is a compatibility alias for `make check`.
Store upload/publish commands and CI deployment workflows are separate:
`release` and `package` never submit to a store or create a GitHub release.

Rspack supports Chrome, Edge, and Firefox and writes
`dist/dev/<browser>` or `dist/release/<browser>`, with matching ZIPs.
The existing `beta` and `build:test` channels remain available separately.
`make test` runs unit/integration tests; run `pnpm test:e2e` explicitly for
browser tests.

