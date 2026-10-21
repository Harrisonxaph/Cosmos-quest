# Architecture

The foundation is a static Vite app using JavaScript modules and schema-typed JSON. JSON Schema draft-07 defines the planet contract and Ajv validates it in tests. No server or accounts are needed. The current page renders a sourced fact for each of the eight planets.

src/data/ owns scientific content; src/main.js renders the initial page using DOM textContent. Components will own reusable UI, scenes will own 3D rendering and cleanup, features will own exploration interactions, and utils will contain pure helpers. hooks/ is reserved for a future hook-based UI framework; no framework is selected yet. Avoid empty abstraction layers.

Tests live only under tests/ and mirror source folders. tests/data/ verifies completeness, identity, ordering, schema enforcement, and citation links. Add tests/features/ as interactions arrive.

One CI job runs install → lint → test → build for PRs and main pushes. A dependent deploy job publishes the validated dist/ artifact only on main. Vite uses a relative asset base for GitHub Pages repository paths. Deployment requires Pages source set to GitHub Actions in repository Settings.
