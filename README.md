# ICU Clinical Simulator

An interactive ICU training simulator for clinical decision-making and electronic health record (EHR) documentation. It includes a 3D ICU room, rule-based scenarios, timed decisions, documentation gates, scoring, session logs, and a final debrief.

This project was developed for the University of West Attica (UNIWA) by **Nikolas-Tryfwn Pnagiotidis**.

Repository: [github.com/nikolaspan/icu-simulator](https://github.com/nikolaspan/icu-simulator)

## Technology stack

- React and TypeScript
- Three.js for the 3D ICU environment
- Vite for development and production builds
- JSON-based clinical scenarios

## First-time setup

Install [Node.js](https://nodejs.org/) 20.19+ or 22.12+, then run:

```bash
git clone https://github.com/nikolaspan/icu-simulator.git
cd icu-simulator
npm ci
npm run dev
```

Open the local address shown by Vite in your browser.

## Other commands

```bash
npm run build    # Create a production build
npm run preview  # Preview the production build
npm run lint     # Check the source code
```

Project documentation is available in the [`Documantation`](./Documantation/) folder.
