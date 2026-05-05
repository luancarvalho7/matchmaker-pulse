# Matchmaker Mobile Luxury Design

## Objective

Build a fully mocked, mobile-first frontend for the matchmaker output using Next.js and TypeScript. The experience should feel premium, fast, and visually striking, with a blue-and-white luxury tech direction and polished motion throughout.

## Product Shape

The V1 is a single-page experience optimized for phones first and scaled up for desktop. It highlights the top recommendation immediately, then guides the user through the top 3 and the full ranked list of 20 matches.

## Visual Direction

- Atmosphere: luxury tech, glass surfaces, luminous blue gradients, soft white highlights
- Palette: deep navy, electric blue, ice blue, white
- Typography: expressive display font paired with a clean modern body font
- Surfaces: translucent cards, layered glows, subtle borders, depth through blur and shadows

## Information Architecture

1. Hero section with headline, summary, and best match spotlight
2. Metrics strip with total matches, top score, and category cues
3. Premium top-3 section with oversized cards
4. Ranked list for all 20 companies with expandable details
5. Inline detail area showing rationale and connection tips

## Interaction Model

- Cards animate in with staggered reveal
- Top match has a persistent glow and animated score treatment
- Ranked cards can expand inline to show `why` and `connectionTips`
- Motion should feel smooth and fluid, not playful or noisy

## Data Model

All data is mocked locally from the provided JSON structure. The UI reads from a local TypeScript data file and does not depend on any backend.

## Testing

- Smoke test for the main screen rendering the top match
- Interaction test for expanding a ranked card and revealing tips

## Constraints

- Mobile-first layout
- Fully mocked content
- Blue and white visual system
- Next.js App Router with TypeScript
- Animation-rich but performant