# Extensions Update Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/cdgepknigaiclfdmjckaknepgcighbnh),
[Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/extensions-update-tracker/),
or [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/mcblolcgepoahkfedfkjohdgnpgbfnpf).

A browser extension that tracks when your installed extensions are updated.

## Features

- **Update notifications** - Get notified when extensions are updated with version info
- **Update history** - View all updates with unread badge counter
- **Notification actions** - View details, visit homepage, open Web Store, enable, or uninstall
- **Settings** - Configure notifications and Web Store button visibility

## Development

**Prerequisites:** Node.js v18+, pnpm

```bash
# Install dependencies
pnpm install

# Build and watch
pnpm start

# Build for production
pnpm release

# Run tests
pnpm test

# Lint
pnpm lint
```

**Load extension:** Build the project, then load the corresponding directory under
`dist/` as an unpacked or temporary extension.

## Contributing

Contributions are welcome! Please:

1. Write tests for new features
2. Ensure `pnpm check` passes

**Issues & Feature Requests:** Use [GitHub Issues](https://github.com/maximtop/extensions-update-tracker/issues)

## Privacy

No data collection, no network requests — see [PRIVACY.md](PRIVACY.md).

## Store listing

Listing copy, the dashboard state and the metrics baseline are documented in
[docs/STORE_LISTING.md](docs/STORE_LISTING.md).

## License

MIT © 2025 Maxim Topciu

## Developer workflow

Use `make install`, `make build`, `make start`, `make check`, and
`make package`. Builds default to Chrome; packaging is local only. See
[development guide](DEVELOPMENT.md) for browser targets, output paths,
and the equivalent pnpm commands.
