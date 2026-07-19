.PHONY: init dev beta release build start lint test chrome

# Optional browser argument: `make dev chrome`, `make beta chrome`, `make release chrome`.
# Only chrome is supported for now; without an argument all browsers are built.
BROWSER := $(filter chrome,$(MAKECMDGOALS))

init:
	pnpm install

dev:
	pnpm build $(BROWSER)

beta:
	pnpm beta $(BROWSER)

release:
	pnpm release $(BROWSER)

# Kept as an alias for the dev build
build:
	pnpm build $(BROWSER)

start:
	pnpm start

lint:
	pnpm lint

test:
	pnpm test && pnpm test:e2e

# Browser names are consumed as arguments by the env targets above
chrome:
	@:
