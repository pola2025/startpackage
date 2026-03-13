# SVG Animation Archive Spec

## Design System Colors

- Navy-900: #0d1b2a (primary dark)
- Navy-700: #1f3044
- Navy-400: #5a7893
- Navy-200: #9fafc0
- Navy-50: #e8edf2
- OK-600: #16a34a (green/success)
- OK-500: #22c55e
- Terra-500: #b85e52 (red/warning)
- Terra-600: #8b3f35
- Gold: #b08d3e

## Rules

1. Each SVG = standalone file, 24x24 viewBox (same as Lucide)
2. Animations use CSS `<style>` inside SVG (no JS, no SMIL)
3. stroke-based design (stroke-width="2", stroke-linecap="round", stroke-linejoin="round")
4. fill="none" by default (same as Lucide icons)
5. Use currentColor for strokes so color can be controlled via CSS
6. Animation should be subtle, professional - NOT flashy/playful
7. Animation duration: 1.5s-3s, infinite loop with ease-in-out
8. File naming: kebab-case.svg (e.g., check-circle.svg)
9. Each file must be valid standalone SVG viewable in browser
