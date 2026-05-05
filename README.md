# Matchmaker Pulse

Frontend mobile-first em Next.js para visualizar uma jornada mockada de matchmaking da FEIMEC com onboarding, pergunta rápida, deck estilo swipe e mapa completo compartilhável em tema verde premium.

## Scripts

```bash
npm run dev
npm run test -- --run
npm run lint
```

## Rodando localmente

1. Instale as dependencias com `npm install`.
2. Inicie com `npm run dev`.
3. Abra `http://localhost:3000`.

## O que esta mockado

- A jornada `Começar -> Pergunta -> Swipe -> Mapa completo`
- O deck de cards com troca por swipe ou botões
- O mapa completo com ranking expandível e retorno para a visão de swipe
- O CTA de compartilhamento da tela final
- Todo o conteúdo de empresas, motivos e dicas de conexão

Os dados vivem em `src/data/matches.ts`.

## Stack

- Next.js App Router
- TypeScript
- Framer Motion
- CSS Modules
- Vitest + Testing Library
