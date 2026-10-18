import type { Library } from "../../domain/entities/library";
import type { Note } from "../../domain/entities/note";
import {
  DEFAULT_THEME,
  nextWorkspaceStyle,
  normalizeTheme,
  type ThemeConfig,
  type WorkspaceStyle,
} from "../../domain/entities/theme-config";
import {
  DEFAULT_GOALS,
  normalizeGoals,
  type Goals,
} from "../../domain/entities/writing-stats";
import { goalProgressOf } from "../../domain/services/stats-calculator";
import { countChars, countWords } from "../../domain/services/word-count";
import type { WindowAppearance } from "../../application/ports/window-appearance";
import type { Clock } from "../../application/ports/clock";
import type { InkStore } from "../../application/ports/ink-store";
import {
  FRESH_INK_SESSION,
  loadInk,
  saveInk,
  type InkSession,
} from "../../application/use-cases/ink-persistence";
import type { InkRun } from "../../domain/services/ink-runs";
import type { NoteRepository } from "../../application/ports/note-repository";
import type { PersistedSettings, SettingsStore } from "../../application/ports/settings-store";
import { Autosave } from "../../application/use-cases/autosave";
import { createTodayNote } from "../../application/use-cases/create-today-note";
import { loadLibrary } from "../../application/use-cases/load-library";
import { openNote } from "../../application/use-cases/open-note";
import { pruneSnapshots } from "../../application/use-cases/prune-snapshots";
import { saveNote } from "../../application/use-cases/save-note";
import type { ProgressTracker } from "../../application/use-cases/track-progress";
import type { CmEditor } from "../../infrastructure/codemirror/editor";
import type { PageInfo } from "../../infrastructure/codemirror/paper-pages";
import { GrammarSession } from "../../infrastructure/languagetool/grammar-session";
import { LanguageToolChecker } from "../../infrastructure/languagetool/lt-checker";
import { loadPosLexicon } from "../../infrastructure/pos/lexicon-loader";
import { GUIDE_PATH, GUIDE_TEXT, GUIDE_TITLE } from "../content/guide";

export type SaveState = "idle" | "pending" | "saved" | "error" | "conflict";

export const WORKSPACE_STYLE_LABELS: Record<WorkspaceStyle, string> = {
  standard: "padrão",
  "typewriter-real": "máquina de escrever",
  transparent: "transparência",
  paper: "papel",
};

export interface WorkspaceDeps {
  repo: NoteRepository;
  settingsStore: SettingsStore;
  tracker: ProgressTracker;
  clock: Clock;
  windowAppearance: WindowAppearance;
  inkStore: InkStore;
  /** abre o dialog nativo de escolher pasta; null se cancelado */
  pickFolder: () => Promise<string | null>;
}

/**
 * Estado reativo do app. Camada fina: toda decisão de negócio mora nos
 * use cases — aqui só orquestração e estado de tela.
 */
export class Workspace {
  library = $state<Library | null>(null);
  note = $state<Note | null>(null);
  theme = $state<ThemeConfig>(DEFAULT_THEME);
  goals = $state<Goals>(DEFAULT_GOALS);
  sidebarOpen = $state(true);
  settingsOpen = $state(false);
  /** modo zen: esconde todo o chrome, só a coluna de texto (não persistido) */
  zenMode = $state(false);
  /** aviso efêmero de troca de modo (⌘D/⌘T/⌘⇧F) — id força reanimação */
  hud = $state<{ label: string; id: number } | null>(null);
  /** movimentação por drag & drop aguardando confirmação do usuário */
  pendingMove = $state<{
    srcPath: string;
    destDir: string;
    noteName: string;
    destName: string;
  } | null>(null);
  saveState = $state<SaveState>("idle");
  conflictNotice = $state<string | null>(null);
  wordsTotal = $state(0);
  charsTotal = $state(0);
  wordsToday = $state(0);
  ready = $state(false);
  /** folha atual / total no estilo papel */
  pageInfo = $state<PageInfo | null>(null);

  private editor: CmEditor | null = null;
  private autosave: Autosave;
  private snapshottedThisSession = new Set<string>();
  private countTimer: ReturnType<typeof setTimeout> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private hudTimer: ReturnType<typeof setTimeout> | null = null;
  private hudSeq = 0;
  private systemDark: MediaQueryList | null = null;
  /** token de "abertura mais recente" — invalida awaits de aberturas antigas */
  private openSeq = 0;
  private inkSession: InkSession = FRESH_INK_SESSION;
  /** trechos da nota aberta, para o editor que ainda vai montar (attachEditor) */
  private openInkRuns: InkRun[] = [];

  constructor(private readonly deps: WorkspaceDeps) {
    this.autosave = new Autosave(() => this.persistCurrentNote(), 1000);
  }

  // ── ciclo de vida ────────────────────────────────────────────────

  async init(): Promise<void> {
    const raw = (await this.deps.settingsStore.load()) as Partial<PersistedSettings> | null;
    const firstLaunch = raw === null;
    this.theme = normalizeTheme(raw?.theme);
    this.goals = normalizeGoals(raw?.goals);
    this.sidebarOpen = raw?.sidebarOpen ?? true;
    this.applyThemeToDom();

    await this.deps.tracker.init();
    this.wordsToday = this.deps.tracker.wordsToday();

    // realce de sintaxe persistido ligado → carrega o léxico em background
    if (this.theme.posHighlight) void this.ensureLexicon();

    const rootPath = raw?.rootPath ?? null;
    if (rootPath) {
      try {
        await this.attachRoot(rootPath);
        if (raw?.lastNotePath) await this.openPath(raw.lastNotePath);
      } catch {
        // pasta sumiu/renomeada — volta ao estado "escolher pasta"
        this.library = null;
      }
    }
    if (firstLaunch) this.openGuide();
    this.ready = true;
  }

  /** Guia inicial: nota virtual, editável mas nunca salva. */
  openGuide(): void {
    void this.autosave.flushNow().catch(() => {});
    this.note = {
      path: GUIDE_PATH,
      title: GUIDE_TITLE,
      content: GUIDE_TEXT,
      mtimeMs: 0,
    };
    this.saveState = "idle";
    this.conflictNotice = null;
    // sem cache: reabrir o guia sempre volta ao texto original
    this.editor?.forget(GUIDE_PATH);
    this.inkSession = FRESH_INK_SESSION;
    this.openInkRuns = [];
    this.editor?.openDocument(GUIDE_PATH, GUIDE_TEXT);
    this.recount(GUIDE_TEXT);
  }

  private isGuide(path: string | undefined): boolean {
    return path === GUIDE_PATH;
  }

  attachEditor(editor: CmEditor): void {
    this.editor = editor;
    if (this.lexicon) editor.setPosLexicon(this.lexicon);
    if (this.note) editor.openDocument(this.note.path, this.note.content, this.openInkRuns);
    this.syncGrammarSession();
  }

  /** flush duplo em blur/quit: nota + estatísticas */
  async flushAll(): Promise<void> {
    await this.autosave.flushNow().catch(() => {});
    await this.deps.tracker.flush().catch(() => {});
  }

  // ── biblioteca ───────────────────────────────────────────────────

  async chooseRoot(): Promise<void> {
    const folder = await this.deps.pickFolder();
    if (!folder) return;
    await this.flushAll();
    this.note = null;
    await this.attachRoot(folder);
    this.persistSettings();
  }

  private async attachRoot(rootPath: string): Promise<void> {
    this.library = await loadLibrary(this.deps.repo, rootPath);
    await this.deps.repo.watch(rootPath, (paths) => void this.onExternalChange(paths));
    // retenção de snapshots em background — não bloqueia o startup
    void pruneSnapshots(this.deps.repo, this.deps.clock, rootPath).catch(() => {});
  }

  async refreshLibrary(): Promise<void> {
    if (!this.library) return;
    this.library = await loadLibrary(this.deps.repo, this.library.rootPath);
  }

  // ── notas ────────────────────────────────────────────────────────

  async openPath(path: string): Promise<void> {
    const seq = ++this.openSeq;
    await this.autosave.flushNow().catch(() => {});
    const note = await openNote(this.deps.repo, path);
    const ink = await this.loadInkFor(note.path, note.content);
    // abertura mais nova venceu durante os awaits: esta fica obsoleta
    if (seq !== this.openSeq) return;
    // daqui até o fim: tudo síncrono — nota, sessão e editor mudam juntos
    this.note = note;
    this.saveState = "idle";
    this.conflictNotice = null;
    this.inkSession = ink.session;
    this.openInkRuns = ink.runs;
    this.editor?.openDocument(note.path, note.content, ink.runs);
    this.recount(note.content);
    this.persistSettings();
    this.grammarSession?.checkSoon();
  }

  /** lateral de tinta da nota; falha de leitura = trata como ilegível (não sobrescreve) */
  private async loadInkFor(
    path: string,
    content: string,
  ): Promise<{ runs: InkRun[]; session: InkSession }> {
    if (!this.library || this.isGuide(path)) {
      return { runs: [], session: FRESH_INK_SESSION };
    }
    try {
      return await loadInk(this.deps.inkStore, this.library.rootPath, path, content);
    } catch {
      return { runs: [], session: { lastSaved: null, unreadable: true } };
    }
  }

  /** nunca lança; devolve false se o lateral não acompanhou */
  private inkFollow(op: (store: InkStore, root: string) => Promise<void>): Promise<boolean> {
    if (!this.library) return Promise.resolve(true);
    return op(this.deps.inkStore, this.library.rootPath).then(
      () => true,
      () => false,
    );
  }

  private inkFollowFailed(): void {
    this.showHud("cores não acompanharam a nota");
  }

  async openToday(): Promise<void> {
    if (!this.library) return;
    const path = await createTodayNote(this.deps.repo, this.deps.clock, this.library.rootPath);
    await this.refreshLibrary();
    await this.openPath(path);
  }

  async createNote(dirPath: string, name: string): Promise<void> {
    const clean = name.trim().replace(/\.md$/i, "");
    if (!clean) return;
    const path = `${dirPath}/${clean}.md`;
    await this.deps.repo.create(path, "");
    await this.refreshLibrary();
    await this.openPath(path);
  }

  async createFolder(dirPath: string, name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) return;
    await this.deps.repo.createFolder(`${dirPath}/${clean}`);
    await this.refreshLibrary();
  }

  async renameNote(path: string, newName: string): Promise<void> {
    const clean = newName.trim().replace(/\.md$/i, "");
    if (!clean) return;
    const dir = path.slice(0, path.lastIndexOf("/"));
    const ext = path.slice(path.lastIndexOf("."));
    const to = `${dir}/${clean}${ext}`;
    if (to === path) return;
    await this.autosave.flushNow().catch(() => {});
    await this.deps.repo.rename(path, to);
    const inkOk = await this.inkFollow((s, r) => s.move(r, path, to));
    if (!inkOk) this.inkFollowFailed();
    this.editor?.forget(path);
    if (this.note?.path === path) await this.openPath(to);
    await this.refreshLibrary();
  }

  /** pedido de mover nota ou pasta (drag & drop) — confirma antes de agir */
  requestMove(srcPath: string, destDir: string): void {
    const currentDir = srcPath.slice(0, srcPath.lastIndexOf("/"));
    if (currentDir === destDir || srcPath === destDir) return;
    if (destDir.startsWith(`${srcPath}/`)) {
      this.showHud("não dá para mover uma pasta para dentro dela mesma");
      return;
    }
    const noteName = srcPath.split("/").pop() ?? srcPath;
    const destName =
      destDir === this.library?.rootPath
        ? "a raiz da biblioteca"
        : `"${destDir.split("/").pop() ?? destDir}"`;
    this.pendingMove = { srcPath, destDir, noteName, destName };
  }

  async confirmMove(): Promise<void> {
    const move = this.pendingMove;
    this.pendingMove = null;
    if (!move) return;
    const to = `${move.destDir}/${move.noteName}`;
    try {
      await this.autosave.flushNow().catch(() => {});
      await this.deps.repo.rename(move.srcPath, to);
      const inkOk = await this.inkFollow((s, r) => s.move(r, move.srcPath, to));
      this.editor?.forgetUnder(move.srcPath);
      const reopen = this.translatedNotePath(move.srcPath, to);
      await this.refreshLibrary();
      if (reopen) await this.openPath(reopen);
      this.showHud(`movido para ${move.destName}`);
      if (!inkOk) this.inkFollowFailed();
    } catch {
      this.showHud("não foi possível mover — nome já existe no destino?");
      await this.refreshLibrary();
    }
  }

  /** caminho novo da nota aberta quando ela (ou a pasta dela) se move */
  private translatedNotePath(from: string, to: string): string | null {
    const current = this.note?.path;
    if (!current) return null;
    if (current === from) return to;
    if (current.startsWith(`${from}/`)) return to + current.slice(from.length);
    return null;
  }

  cancelMove(): void {
    this.pendingMove = null;
  }

  async deleteNote(path: string): Promise<void> {
    await this.deps.repo.delete(path);
    await this.inkFollow((s, r) => s.trash(r, path));
    this.editor?.forget(path);
    if (this.note?.path === path) {
      this.note = null;
      this.saveState = "idle";
    }
    await this.refreshLibrary();
  }

  async renameFolder(path: string, newName: string): Promise<void> {
    const clean = newName.trim();
    if (!clean) return;
    const parent = path.slice(0, path.lastIndexOf("/"));
    const to = `${parent}/${clean}`;
    if (to === path) return;
    await this.autosave.flushNow().catch(() => {});
    await this.deps.repo.rename(path, to);
    const inkOk = await this.inkFollow((s, r) => s.move(r, path, to));
    if (!inkOk) this.inkFollowFailed();
    this.editor?.forgetUnder(path);
    const reopen = this.translatedNotePath(path, to);
    await this.refreshLibrary();
    if (reopen) await this.openPath(reopen);
  }

  /** exclui a pasta inteira — vai para a Lixeira do macOS, recuperável */
  async deleteFolder(path: string): Promise<void> {
    await this.deps.repo.delete(path);
    await this.inkFollow((s, r) => s.trash(r, path));
    this.editor?.forgetUnder(path);
    if (this.note && (this.note.path === path || this.note.path.startsWith(`${path}/`))) {
      this.note = null;
      this.saveState = "idle";
    }
    await this.refreshLibrary();
  }

  // ── edição / autosave ────────────────────────────────────────────

  onPageInfo(info: PageInfo | null): void {
    this.pageInfo = info;
  }

  /** chamado pelo CmEditor a cada transação que muda o doc */
  onDocChanged(getText: () => string, wordDelta: number): void {
    const note = this.note;
    if (!note) return;

    // o guia é playground: recontagem sim, save/stats/snapshot não
    if (this.isGuide(note.path)) {
      this.scheduleRecount(getText);
      return;
    }

    // primeira modificação da sessão nesta nota → snapshot da versão em disco
    if (!this.snapshottedThisSession.has(note.path) && this.library) {
      this.snapshottedThisSession.add(note.path);
      void this.deps.repo.snapshot(this.library.rootPath, note.path).catch(() => {});
    }

    this.deps.tracker.recordDelta(note.path, wordDelta);
    this.wordsToday = this.deps.tracker.wordsToday();
    this.saveState = "pending";
    this.autosave.markDirty();
    this.scheduleRecount(getText);
    this.grammarSession?.noteChanged();
  }

  async saveNow(): Promise<void> {
    await this.autosave.flushNow().catch(() => {});
  }

  private async persistCurrentNote(): Promise<void> {
    const note = this.note;
    const editor = this.editor;
    if (!note || !editor || this.isGuide(note.path)) return;

    try {
      const text = editor.currentText();
      const runs = editor.currentInkRuns();
      // sessão da nota que estamos salvando, capturada antes de qualquer await
      const session = this.inkSession;
      const outcome = await saveNote(this.deps.repo, note, text);
      if (outcome.conflictPath) {
        // o disco mudou por fora: nossa edição foi preservada no .conflict —
        // seguimos editando NELE; o arquivo original fica com a versão externa
        const conflictNotice = `O arquivo mudou fora do tinta. Suas alterações seguem aqui, salvas como ${outcome.conflictPath.split("/").pop()}.`;
        this.editor?.forget(note.path);
        const conflictNote = await openNote(this.deps.repo, outcome.conflictPath);
        // as cores acompanham a edição preservada no .conflict (sessão nova)
        const inkSaved = await this.persistInk(conflictNote.path, text, runs, FRESH_INK_SESSION);
        // outra nota foi aberta durante os awaits: não a sobrescreve
        if (this.note?.path === note.path) {
          this.conflictNotice = conflictNotice;
          this.saveState = "conflict";
          this.note = conflictNote;
          this.inkSession = inkSaved ?? FRESH_INK_SESSION;
          this.openInkRuns = runs;
          this.editor?.openDocument(conflictNote.path, conflictNote.content, runs);
        }
        await this.refreshLibrary();
      } else {
        // outra nota pode ter sido aberta durante o save: só atualiza se ainda é esta
        if (this.note?.path === note.path) this.note = outcome.note;
        const inkSaved = await this.persistInk(note.path, text, runs, session);
        // o resultado só vale se a nota ainda é a mesma
        if (this.note?.path === note.path) {
          if (inkSaved) this.inkSession = inkSaved;
          if (this.saveState !== "pending" || !this.autosave.isDirty) this.saveState = "saved";
        }
      }
      void this.deps.tracker.flush().catch(() => {});
    } catch (err) {
      this.saveState = "error";
      throw err;
    }
  }

  /** a nota já está salva; falha aqui só perde cor, nunca texto */
  private async persistInk(
    path: string,
    text: string,
    runs: readonly InkRun[],
    session: InkSession,
  ): Promise<InkSession | null> {
    if (!this.library) return null;
    try {
      return await saveInk(
        this.deps.inkStore,
        this.library.rootPath,
        path,
        text,
        runs,
        session,
      );
    } catch {
      this.showHud("cores não salvas — nova tentativa no próximo save");
      return null;
    }
  }

  /** método (não inline) para o TS não estreitar saveState entre awaits */
  private hasUnsavedEdits(): boolean {
    return this.saveState === "pending" || this.autosave.isDirty;
  }

  private async onExternalChange(paths: string[]): Promise<void> {
    await this.refreshLibrary();
    const current = this.note;
    if (!current || !paths.includes(current.path)) return;

    if (this.saveState === "pending" || this.autosave.isDirty) {
      // há edição não salva — o próximo save detecta o conflito via mtime
      return;
    }
    // sem edição pendente: recarrega silenciosamente a versão nova
    // sem incrementar: uma abertura do usuário em andamento deve vencer
    const seq = this.openSeq;
    try {
      const fresh = await openNote(this.deps.repo, current.path);
      const ink = await this.loadInkFor(fresh.path, fresh.content);
      // outra abertura, troca de nota ou edição durante os awaits: abandona
      if (seq !== this.openSeq) return;
      if (this.note?.path !== current.path) return;
      if (this.hasUnsavedEdits()) return;
      // daqui até o fim: tudo síncrono
      this.editor?.forget(current.path);
      this.note = fresh;
      this.inkSession = ink.session;
      this.openInkRuns = ink.runs;
      this.editor?.openDocument(fresh.path, fresh.content, ink.runs);
      this.recount(fresh.content);
    } catch {
      // arquivo apagado por fora
      if (seq === this.openSeq && this.note?.path === current.path) this.note = null;
    }
  }

  // ── contagem ─────────────────────────────────────────────────────

  private scheduleRecount(getText: () => string): void {
    if (this.countTimer) clearTimeout(this.countTimer);
    this.countTimer = setTimeout(() => {
      this.countTimer = null;
      this.recount(getText());
    }, 400);
  }

  private recount(text: string): void {
    this.wordsTotal = countWords(text);
    this.charsTotal = countChars(text);
  }

  // ── tema / settings ──────────────────────────────────────────────

  updateTheme(partial: Partial<ThemeConfig>): void {
    this.theme = normalizeTheme({ ...this.theme, ...partial });
    this.applyThemeToDom();
    this.editor?.applyConfig(this.theme);
    this.persistSettings();
  }

  updateGoals(partial: Partial<Goals>): void {
    this.goals = normalizeGoals({ ...this.goals, ...partial });
    this.persistSettings();
  }

  toggleSidebar(): void {
    if (this.guardRealTypewriter()) return;
    this.sidebarOpen = !this.sidebarOpen;
    this.persistSettings();
  }

  cycleFocusMode(): void {
    if (this.guardRealTypewriter()) return;
    const order = ["off", "sentence", "paragraph"] as const;
    const next = order[(order.indexOf(this.theme.focusMode) + 1) % order.length]!;
    this.updateTheme({ focusMode: next });
    const label = { off: "desligado", sentence: "sentença", paragraph: "parágrafo" }[next];
    this.showHud(`foco: ${label}`);
  }

  toggleTypewriter(): void {
    if (this.guardRealTypewriter()) return;
    this.updateTheme({ typewriter: !this.theme.typewriter });
    this.showHud(`typewriter: ${this.theme.typewriter ? "ligado" : "desligado"}`);
  }

  toggleZen(): void {
    if (this.guardRealTypewriter()) return;
    this.zenMode = !this.zenMode;
    this.editor?.focus();
    this.showHud(this.zenMode ? "zen: ligado — esc sai" : "zen: desligado");
  }

  cycleWorkspaceStyle(): void {
    const next = nextWorkspaceStyle(this.theme.workspaceStyle);
    this.updateTheme({ workspaceStyle: next });
    this.editor?.focus();
    this.showHud(`estilo: ${WORKSPACE_STYLE_LABELS[next]}`);
  }

  /** no typewriter real, foco/typewriter/sidebar/zen não se aplicam */
  private guardRealTypewriter(): boolean {
    if (!this.isRealTypewriter) return false;
    this.showHud("indisponível na máquina de escrever — ⌘E troca o estilo");
    return true;
  }

  /** liga/desliga o realce de classes gramaticais; carrega o léxico na primeira vez */
  async togglePosHighlight(): Promise<void> {
    const turningOn = !this.theme.posHighlight;
    if (turningOn) {
      const ok = await this.ensureLexicon();
      if (!ok) return;
    }
    this.updateTheme({ posHighlight: turningOn });
    this.showHud(turningOn ? "sintaxe: ligada" : "sintaxe: desligada");
  }

  private lexicon: Awaited<ReturnType<typeof loadPosLexicon>> | null = null;
  private grammarSession: GrammarSession | null = null;

  /** liga/desliga a gramática LanguageTool (online, opt-in) */
  toggleGrammarCheck(): void {
    const turningOn = !this.theme.grammarCheck;
    this.updateTheme({ grammarCheck: turningOn });
    this.syncGrammarSession();
    this.showHud(turningOn ? "gramática: ligada (online)" : "gramática: desligada");
  }

  private syncGrammarSession(): void {
    if (this.theme.grammarCheck && this.editor && !this.grammarSession) {
      this.grammarSession = new GrammarSession(this.editor, new LanguageToolChecker());
      this.grammarSession.checkSoon();
    } else if (!this.theme.grammarCheck && this.grammarSession) {
      this.grammarSession.dispose();
      this.grammarSession = null;
    }
  }

  private async ensureLexicon(): Promise<boolean> {
    if (this.lexicon) return true;
    this.showHud("carregando léxico…");
    try {
      this.lexicon = await loadPosLexicon();
      this.editor?.setPosLexicon(this.lexicon);
      return true;
    } catch {
      this.showHud("erro ao carregar o léxico");
      return false;
    }
  }

  /** mostra um aviso efêmero no canto; some sozinho */
  private showHud(label: string): void {
    if (this.hudTimer) clearTimeout(this.hudTimer);
    this.hud = { label, id: ++this.hudSeq };
    this.hudTimer = setTimeout(() => {
      this.hudTimer = null;
      this.hud = null;
    }, 1700);
  }

  get isRealTypewriter(): boolean {
    return this.theme.workspaceStyle === "typewriter-real";
  }

  /** zen do usuário OU zen forçado do typewriter real (não toca em zenMode) */
  get chromeHidden(): boolean {
    return this.zenMode || this.isRealTypewriter;
  }

  get goalProgress() {
    const target = this.goals.dailyWords;
    if (!target) return null;
    // deriva do $state reativo (o tracker é infraestrutura não-reativa)
    return goalProgressOf(this.wordsToday, target);
  }

  private applyThemeToDom(): void {
    const root = document.documentElement;
    root.dataset.accent = this.theme.accent;
    root.dataset.style = this.theme.workspaceStyle;
    root.dataset.ink = this.theme.ink;
    const alpha = (n: number) => `${Math.round(Math.min(1, n) * 100)}%`;
    root.style.setProperty("--tinta-window-alpha", alpha(this.theme.windowOpacity));
    root.style.setProperty("--tinta-chrome-alpha", alpha(this.theme.windowOpacity + 0.15));
    const blur = this.theme.workspaceStyle === "transparent" ? this.theme.windowBlur : "off";
    // sem desfoque nativo, a transparência ainda funciona — falha silenciosa
    void this.deps.windowAppearance.setBlur(blur).catch(() => {});

    if (!this.systemDark) {
      this.systemDark = window.matchMedia("(prefers-color-scheme: dark)");
      this.systemDark.addEventListener("change", () => this.applyThemeToDom());
    }
    const dark =
      this.theme.mode === "dark" || (this.theme.mode === "system" && this.systemDark.matches);
    root.dataset.theme = dark ? "dark" : "light";
  }

  private persistSettings(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      const snapshot: PersistedSettings = {
        theme: { ...this.theme },
        goals: { ...this.goals },
        rootPath: this.library?.rootPath ?? null,
        // o guia é virtual — nunca pode ser o "última nota" de um relaunch
        lastNotePath: this.isGuide(this.note?.path) ? null : (this.note?.path ?? null),
        sidebarOpen: this.sidebarOpen,
      };
      void this.deps.settingsStore.save(snapshot).catch(() => {});
    }, 300);
  }
}
