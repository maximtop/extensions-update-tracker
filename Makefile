.PHONY: build test

init:
	pnpm install

build:
	pnpm build

release:
	pnpm release

start:
	pnpm start

lint:
	pnpm lint

test:
	pnpm test && pnpm test:e2e
