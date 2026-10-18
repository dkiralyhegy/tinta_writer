# tinta

Editor de texto minimalista para escrita — notas diárias e escrita longa
(livros). Markdown sempre visível mas estilizado tipograficamente (estilo
iA Writer), sobre o design system do Estúdio AB.

Construído com **Tauri v2** (backend Rust) + **Svelte 5** + **CodeMirror 6**.

## Rodar

```sh
npm install
npm run tauri dev      # desenvolvimento
npm run tauri build    # gera .app e .dmg em src-tauri/target/release/bundle/
npm test               # testes de domínio/application (Vitest, sem Tauri)
npm run check          # svelte-check / TypeScript
```

## Atalhos

| Atalho | Ação |
|---|---|
| `⌘S` | salvar agora (autosave já cobre) |
| `⌘J` | nota de hoje (`<biblioteca>/daily/YYYY-MM-DD.md`) |
| `⌘D` | ciclar modo foco (off → sentença → parágrafo) |
| `⌘T` | typewriter scrolling |
| `⌘\` | mostrar/ocultar sidebar |
| `⌘⇧F` | modo zen — esconde todo o chrome; `Esc` sai |
| `⌘,` | painel de ajustes |
| `⌘F` | buscar no texto |

## Arquitetura (Clean Architecture)

Dependências apontam para dentro: `ui → application → domain`;
`infrastructure` implementa as portas de `application`. Só `src/main.ts`
(composition root) conhece todas as camadas.

```
src/
├── domain/           # entidades e serviços puros — zero imports externos
│   ├── entities/     # note, library, theme-config, writing-stats
│   └── services/     # word-count, daily-note, stats-calculator, snapshot-policy
├── application/
│   ├── ports/        # interfaces: note-repository, settings-store, stats-store, clock
│   └── use-cases/    # open/save-note, autosave, create-today-note, track-progress…
├── infrastructure/
│   ├── tauri/        # adapters das portas via invoke() dos commands Rust
│   └── codemirror/   # editor isolado: tema iA, focus-mode, typewriter
└── ui/               # Svelte 5 (runes) — componentes + workspace store
src-tauri/src/
├── commands/         # notes (escrita atômica), library, snapshots, storage
└── watcher.rs        # notify + filtro de self-writes → evento "fs-changed"
```

Os testes em `tests/` rodam sem Tauri, DOM ou CodeMirror — com fakes
in-memory e clock injetado.

## Segurança dos dados

1. **Autosave**: debounce 1s + flush em blur, troca de nota e fechar janela.
2. **Escrita atômica** (Rust): tmp no mesmo dir → fsync → rename → fsync do
   dir. Crash nunca corrompe o arquivo.
3. **Snapshots**: antes da primeira gravação de cada sessão de edição, a
   versão em disco vai para `<biblioteca>/.snapshots/`. Retenção: tudo de
   24h, 1/dia por 30 dias (prune no startup).
4. **Conflito externo**: se o arquivo mudou por fora (iCloud/outro editor),
   o original fica intacto e sua edição segue num `.conflict-<ts>.md` —
   nenhum lado se perde.
5. **Excluir** move para a Lixeira do macOS, nunca apaga de verdade.

Settings e estatísticas: JSON em
`~/Library/Application Support/com.artboeira.tinta/`.

## Fontes

- **Neue Haas Grotesk Display** — *trial* Linotype (uso pessoal; licenciar
  antes de distribuir).
- **Calling Code** — mono do design system (sem itálico; o WebKit sintetiza).
- **iA Writer Duo** — SIL OFL, com itálico real; opção de fonte do editor.
- **EB Garamond** — SIL OFL; serifada de livro (linhagem Garamond, a mesma
  da Sabon). Se um dia a Sabon for licenciada, basta trocar os arquivos.
- **Courier Prime** — SIL OFL; fonte do estilo máquina de escrever (⌘E).
