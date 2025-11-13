# Extensions Update Tracker

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[Install from Chrome Web Store](https://chromewebstore.google.com/detail/cdgepknigaiclfdmjckaknepgcighbnh)**

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

**Load extension:** Build the project, then load the `dist` folder as an unpacked extension in Chrome.

## Contributing

Contributions are welcome! Please:

1. Write tests for new features
2. Ensure `pnpm test` and `pnpm lint` pass

**Issues & Feature Requests:** Use [GitHub Issues](https://github.com/maximtop/extensions-update-tracker/issues)

## License

MIT © 2025 Maxim Topciu
