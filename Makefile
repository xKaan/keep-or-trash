export PATH := $(HOME)/.cargo/bin:$(PATH)

.DEFAULT_GOAL := help
.PHONY: help install dev build build-front check check-rust check-front test test-front test-rust fmt clean

help:
	@echo "make install      - install npm dependencies"
	@echo "make dev          - run the app in development mode"
	@echo "make build        - build the app binary"
	@echo "make build-front  - build the frontend only"
	@echo "make check        - TypeScript type-check + cargo check"
	@echo "make test         - run all tests"
	@echo "make fmt          - format the Rust code"
	@echo "make clean        - remove build artifacts"

install:
	npm install

dev:
	npm run tauri dev

build:
	npm run tauri build

build-front:
	npm run build

check: check-front check-rust

check-front:
	npx vue-tsc --noEmit

check-rust:
	cd src-tauri && cargo check

test: test-front test-rust

test-front:
	npm test

test-rust:
	cd src-tauri && cargo test

fmt:
	cd src-tauri && cargo fmt

clean:
	rm -rf dist
	cd src-tauri && cargo clean
