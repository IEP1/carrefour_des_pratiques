---
name: iep1-design
description: Use this skill to generate well-branded interfaces and assets for IEP1 (Inspection de l'Enseignement Primaire, circonscription 1, Gouvernement de la Nouvelle-Calédonie), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and reusable components for prototyping meeting/training decks and communications.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Always use the color/type/spacing tokens in `tokens/*.css` (linked via `styles.css`) instead of hardcoding hex codes or font names — that is what makes IEP1 branding consistent across everything you build with this skill, without needing to restate the color codes each time.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out of `assets/` and create static HTML files for the user to view — `templates/reunion-formation-deck.html` is a ready-to-duplicate starting point for meeting/training decks. If working on production code, copy assets and components from `components/core/` and read the rules in README.md to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
