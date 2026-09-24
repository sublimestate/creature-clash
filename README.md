# Creature Clash

An auto-battler creature collection game built entirely in React Native for the web, utilizing Expo Router, Zustand, and Reanimated. Watch your pets automatically battle it out through the neighborhood in a deterministic 6-role combat engine, collect new creatures, and build the ultimate team!

## Features

- 🐾 **24 Procedurally Generated Creatures**: Cats, dogs, and birds, each with distinct stats, abilities, and procedural 32x32 pixel sprites.
- ⚔️ **Deterministic Auto-Battling Engine**: A purely functional combat engine that handles stats, buffs, cooldowns, speed-priority, dodging, and status conditions without any UI coupling.
- 🪨 **6-Role Combat Chart**: Rock-paper-scissors style combat featuring Predator, Swift, Tough, Cunning, Social, and Wild roles. 
- 🎵 **Procedural Audio**: Synthesized chiptune BGM and sound effects using the Web Audio API—no external audio assets required.
- 💾 **Local Persistence**: Full save state management with Zustand and `localStorage`, tracking unlocks, gold, gems, and your Field Journal.
- 📖 **Campaign Mode**: 3 complete chapters with story intros, 15 stages, bosses, and an outro.

## Tech Stack

- **Framework**: React Native + Expo SDK 54 (Web), Expo Router
- **State Management**: Zustand 4.x
- **Animations**: React Native Reanimated 4
- **Testing**: Vitest (pure engine tests), Playwright (E2E headless testing)
- **Language**: TypeScript

## Getting Started

To run the game locally, you'll need Node.js installed.

```bash
cd app                      # all commands run from here
npm install                 # install dependencies
npm run web                 # start the expo dev server and open in browser
```

### Other Commands

```bash
npm run web -- --clear      # web with cache clearing (use after route changes)
npm test                    # run vitest engine tests
npm run test:e2e            # run playwright E2E web tests
npm run typecheck           # run typescript validation
```

## Contributing

Pull requests are welcome! If you're planning to make significant structural changes, please open an issue first to discuss your ideas.
When adding new game mechanics, ensure that determinism is strictly maintained within `src/engine` and verified by engine tests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
