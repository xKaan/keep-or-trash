# Keep or Trash

A desktop app to sort a folder of photos one at a time. Each picture gets a single decision — **keep** it or **send it to the trash** — and the app remembers where you left off so you can come back to a folder later.

Built with [Tauri v2](https://tauri.app) (Rust backend) and Vue 3 + TypeScript.

> The user interface is in French.

## How it works

- **Pick a folder.** Photos are listed non-recursively; `.jpg`, `.jpeg`, `.png` and `.webp` are supported, sorted by name. The 5 most recent folders are offered as shortcuts.
- **Sort.** One photo at a time, with zoom, rotation and a thumbnail rail to jump around. *Keep* leaves the file exactly where it is and only records it as reviewed; *Trash* physically moves it into a `trash/` subfolder of the source folder.
- **Undo.** A session-only undo stack moves a trashed file back out of `trash/`.
- **Review the trash.** A separate screen lists everything in `trash/`, with multi-selection to restore files or delete them permanently.
- **Resume later.** Reviewed files are persisted per folder, so reopening a folder skips what you already decided on.

Nothing is deleted without an explicit confirmation, and no file leaves the folder you selected.

## Settings

Preferences live in `localStorage` and apply immediately:

- **Theme** — light, dark, or follow the system (dark by default).
- **Thumbnail size** — small, medium, or large.
- **Shortcuts** — one key per action, remappable. Defaults:

| Action         | Key         |
| -------------- | ----------- |
| Previous photo | `←`         |
| Next photo     | `→`         |
| Keep           | `K`         |
| Trash          | `D`         |
| Undo           | `Backspace` |

Zoom is fixed to `+` / `=` / `-`. Assigning a key already used by another action clears it from that action.

## Requirements

- Node.js 18+ and npm
- Rust toolchain (stable)
- The [Tauri v2 system dependencies](https://tauri.app/start/prerequisites/) for your platform

Windows is the primary target. The project is developed under WSL2, where Rust and TypeScript code compiles and tests fine, but `make dev` / `make build` need a native GUI.

## Getting started

```bash
make install      # install npm dependencies
make dev          # run the app in development mode
make build        # build the app binary
```

## Development

```bash
make check        # vue-tsc --noEmit + cargo check
make test         # vitest run + cargo test
make fmt          # cargo fmt
make clean        # remove build artifacts
```

Run `make` with no target for the full list.

Single tests:

```bash
npx vitest run src/stores/photoSession.spec.ts
npx vitest run -t 'undo restores'
cd src-tauri && cargo test move_to_trash_moves_file
```

## Project structure

```
src/
  components/      Vue screens (picker, sort, trash, settings)
  stores/          Pinia stores: photoSession (sort loop), trashSession
  lib/             persistence (tauri-plugin-store), settings, taskQueue
  composables/     useTheme, useSettings
  styles/          global SCSS, design tokens as CSS custom properties
src-tauri/
  src/commands.rs  all filesystem work, exposed as Tauri commands
```

All filesystem access lives in Rust rather than in JS-side plugin calls. `read_photo` and `read_thumbnail` return base64 `data:` URLs — deliberately not `convertFileSrc`, which would require declaring allowed directories up front, while the folder is only known at runtime. `delete_permanently` rejects any non-plain filename, so paths can never escape `trash/`.

Sort history is stored with `tauri-plugin-store` in `history.json`, keyed by absolute folder path. UI preferences are kept separately in `localStorage` so they can be read synchronously at startup without a theme flash.

## License

Not published under a license yet.
