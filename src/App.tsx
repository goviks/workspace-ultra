import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Board } from './components/Board';
import { CardModal } from './components/CardModal';
import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  isColorThemeId,
  type ColorThemeId,
} from './data/colorThemes';
import {
  LANGUAGES,
  LANGUAGE_NAMES,
  isLanguage,
  translate,
  type Language,
  type TranslationKey,
} from './data/translations';
import {
  useBoardRuntimeStore,
  useBoardStore,
} from './store/boardStore';
import type {
  BoardCard,
  BoardTag,
  CardStatusFilter,
} from './types/board';

type Theme = 'light' | 'dark';

const isTextInput = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.matches('input, textarea, select, [contenteditable="true"]'));

const THEME_STORAGE_KEY = 'portfolio-kanban-theme';
const BACKGROUND_STORAGE_KEY = 'portfolio-kanban-background';
const PROFILE_STORAGE_KEY = 'portfolio-kanban-profile-name';
const COLOR_THEME_STORAGE_KEY = 'portfolio-kanban-color-theme';
const FONT_STORAGE_KEY = 'portfolio-kanban-font';
const LANGUAGE_STORAGE_KEY = 'portfolio-kanban-language';
const MAX_BACKGROUND_SIZE = 1024 * 1024;
const TARGET_BACKGROUND_RATIO = 16 / 9;

const getSavedValue = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const getInitialTheme = (): Theme => {
  const savedTheme = getSavedValue(THEME_STORAGE_KEY);
  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export default function App() {
  const board = useBoardStore((state) => state.board);
  const pastLength = useBoardStore((state) => state.past.length);
  const futureLength = useBoardStore((state) => state.future.length);
  const addCard = useBoardStore((state) => state.addCard);
  const updateCard = useBoardStore((state) => state.updateCard);
  const undo = useBoardStore((state) => state.undo);
  const redo = useBoardStore((state) => state.redo);
  const resetBoard = useBoardStore((state) => state.resetBoard);
  const hydration = useBoardRuntimeStore((state) => state.hydration);
  const storageError = useBoardRuntimeStore((state) => state.storageError);
  const saveStatus = useBoardRuntimeStore((state) => state.saveStatus);
  const saveError = useBoardRuntimeStore((state) => state.saveError);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<BoardTag | 'all'>('all');
  const [statusFilter, setStatusFilter] =
    useState<CardStatusFilter>('all');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [colorTheme, setColorTheme] = useState<ColorThemeId>(() => {
    const savedTheme = getSavedValue(COLOR_THEME_STORAGE_KEY);
    return savedTheme && isColorThemeId(savedTheme)
      ? savedTheme
      : DEFAULT_COLOR_THEME;
  });
  const [fontStyle, setFontStyle] = useState(() => {
    const savedFont = getSavedValue(FONT_STORAGE_KEY);
    return savedFont === 'rounded' ||
      savedFont === 'pixel' ||
      savedFont === 'serif'
      ? savedFont
      : 'rounded';
  });
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = getSavedValue(LANGUAGE_STORAGE_KEY);
    return savedLanguage && isLanguage(savedLanguage)
      ? savedLanguage
      : 'ru';
  });
  const [userName, setUserName] = useState(
    () => getSavedValue(PROFILE_STORAGE_KEY)?.trim() ?? ''
  );
  const [profileNameInput, setProfileNameInput] = useState('');
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const appearancePanelRef = useRef<HTMLDivElement>(null);
  const savedNoticeTimerRef = useRef<number | null>(null);
  const previousSaveStatusRef = useRef(saveStatus);
  const [showSavedNotice, setShowSavedNotice] = useState(false);
  const availableTags = Array.from(
    new Set(
      board.columns.flatMap((column) =>
        column.cards.flatMap((card) => card.tags)
      )
    )
  ).sort((first, second) => first.localeCompare(second));
  const [modalState, setModalState] = useState<{
    columnId: string;
    card: BoardCard | null;
  } | null>(null);
  const t = (key: TranslationKey) => translate(language, key);

  const showSaved = () => {
    setShowSavedNotice(true);
    if (savedNoticeTimerRef.current !== null) {
      window.clearTimeout(savedNoticeTimerRef.current);
    }
    savedNoticeTimerRef.current = window.setTimeout(
      () => setShowSavedNotice(false),
      1800
    );
  };

  function savePreference<T extends string>(
    key: string,
    value: T,
    update: (nextValue: T) => void
  ) {
    try {
      window.localStorage.setItem(key, value);
      update(value);
      setBackgroundError(null);
      showSaved();
    } catch (error) {
      setBackgroundError(
        error instanceof Error ? error.message : t('languageSaveError')
      );
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang =
      language === 'zh' ? 'zh-CN' : language === 'en' ? 'en' : 'ru';
  }, [language]);

  useEffect(() => {
    if (!appearanceOpen) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !appearancePanelRef.current?.contains(event.target)
      ) {
        setAppearanceOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [appearanceOpen]);

  useEffect(
    () => () => {
      if (savedNoticeTimerRef.current !== null) {
        window.clearTimeout(savedNoticeTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    const previousSaveStatus = previousSaveStatusRef.current;
    previousSaveStatusRef.current = saveStatus;
    if (
      hydration === 'ready' &&
      previousSaveStatus === 'saving' &&
      saveStatus === 'saved'
    ) {
      showSaved();
    }
  }, [hydration, saveStatus]);

  useEffect(() => {
    try {
      setBackgroundImage(window.localStorage.getItem(BACKGROUND_STORAGE_KEY));
    } catch (error) {
      setBackgroundError(
        error instanceof Error
          ? `${t('backgroundLoadError')} ${error.message}`
          : t('backgroundLoadError')
      );
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifierPressed = event.ctrlKey || event.metaKey;
      if (
        isModifierPressed &&
        event.key.toLowerCase() === 'z' &&
        !isTextInput(event.target)
      ) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'n' &&
        !isTextInput(event.target) &&
        !modalState
      ) {
        const firstColumn = board.columns[0];
        if (firstColumn) {
          event.preventDefault();
          setModalState({ columnId: firstColumn.id, card: null });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board.columns, modalState, redo, undo]);

  const openCreateModal = (columnId: string) => {
    setModalState({ columnId, card: null });
  };

  const openEditModal = (card: BoardCard) => {
    const column = board.columns.find((item) =>
      item.cards.some((candidate) => candidate.id === card.id)
    );
    if (column) {
      setModalState({ columnId: column.id, card });
    }
  };

  const saveCard = (values: {
    title: string;
    description: string;
    tags: BoardTag[];
  }) => {
    if (!modalState) {
      return;
    }
    if (modalState.card) {
      updateCard(modalState.card.id, values);
    } else {
      addCard(modalState.columnId, values);
    }
    setModalState(null);
  };

  const saveBackground = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBackgroundError(null);
    if (!file.type.startsWith('image/')) {
      setBackgroundError(t('imageInvalid'));
      return;
    }
    if (file.size > MAX_BACKGROUND_SIZE) {
      setBackgroundError(t('imageTooLarge'));
      return;
    }

    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setBackgroundError(t('imageReadFailed'));
      return;
    }

    const ratio = bitmap.width / bitmap.height;
    bitmap.close();
    if (Math.abs(ratio - TARGET_BACKGROUND_RATIO) > 0.01) {
      setBackgroundError(t('imageAspectRatio'));
      return;
    }

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error(t('imageConvertError')));
        }
      };
      reader.onerror = () =>
        reject(
          reader.error ?? new Error(t('backgroundReadError'))
        );
      reader.readAsDataURL(file);
    }).catch((error: unknown) => {
      setBackgroundError(
        error instanceof Error ? error.message : t('backgroundReadError')
      );
      return null;
    });

    if (!dataUrl) {
      return;
    }

    try {
      window.localStorage.setItem(BACKGROUND_STORAGE_KEY, dataUrl);
      setBackgroundImage(dataUrl);
      setBackgroundError(null);
      showSaved();
    } catch (error) {
      setBackgroundError(
        error instanceof Error
          ? `${t('backgroundSaveError')} ${error.message}`
          : t('backgroundStorageFull')
      );
    }
  };

  const removeBackground = () => {
    try {
      window.localStorage.removeItem(BACKGROUND_STORAGE_KEY);
      setBackgroundImage(null);
      setBackgroundError(null);
      showSaved();
    } catch (error) {
      setBackgroundError(
        error instanceof Error
          ? `${t('backgroundRemoveError')} ${error.message}`
          : t('backgroundRemoveError')
      );
    }
  };

  const saveProfileName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = profileNameInput.trim().slice(0, 40);
    if (!normalizedName) {
      return;
    }

    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, normalizedName);
      showSaved();
    } catch {
      setBackgroundError(
        t('nameStorageWarning')
      );
    }
    setUserName(normalizedName);
    setProfileNameInput('');
  };

  const startNameChange = () => {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      setProfileNameInput(userName);
      setUserName('');
    } catch (error) {
      setBackgroundError(
        error instanceof Error ? error.message : t('languageSaveError')
      );
    }
  };

  const clearBoard = async () => {
    try {
      await useBoardStore.persist.clearStorage();
      resetBoard();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      useBoardRuntimeStore.setState({
        hydration: 'error',
        storageError: message,
      });
    }
  };

  const saveStatusLabel =
    saveStatus === 'saving'
      ? t('saving')
      : saveStatus === 'error'
        ? t('saveFailed')
        : t('saved');

  if (hydration === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {t('loading')}
      </div>
    );
  }

  if (hydration === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <section
          className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900 dark:bg-slate-900"
          role="alert"
        >
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t('storageErrorTitle')}
          </h1>
          <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">
            {storageError ?? t('storageFallback')}
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
            onClick={clearBoard}
          >
            {t('resetStorage')}
          </button>
        </section>
      </main>
    );
  }

  return (
    <div
      data-color-theme={colorTheme}
      data-font={fontStyle}
      className="color-themed flex min-h-screen flex-col bg-slate-50 bg-cover bg-center bg-fixed text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100"
      style={
        backgroundImage
          ? {
              backgroundImage: `linear-gradient(${
                theme === 'dark'
                  ? 'rgba(2, 6, 23, 0.46), rgba(2, 6, 23, 0.58)'
                  : 'rgba(248, 250, 252, 0.30), rgba(248, 250, 252, 0.42)'
              }), url("${backgroundImage}")`,
            }
          : undefined
      }
    >
      <header className="relative z-50 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="personal-zone-label text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
                {t('personalZone')}{userName ? ` · ${userName}` : ''}
              </p>
              <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight sm:text-2xl">
                # {userName ? `${userName} — ${t('boardTitle')}` : t('boardTitle')}
              </h1>
              {userName && (
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-400 dark:hover:text-indigo-300"
                    onClick={startNameChange}
                >
                  {t('changeName')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {(saveStatus !== 'saved' || showSavedNotice || backgroundError) && (
                <span
                className={`text-xs font-medium ${
                  saveStatus === 'error' || backgroundError
                    ? 'text-rose-600 dark:text-rose-400'
                    : saveStatus === 'saving'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-700 dark:text-emerald-400'
                }`}
                role="status"
                aria-live="polite"
              >
                  {backgroundError
                    ? t('saveFailed')
                    : saveStatus === 'saved'
                      ? t('saved')
                      : saveStatusLabel}
                </span>
              )}
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>{t('language')}</span>
                <select
                  aria-label={t('languageLabel')}
                  value={language}
                  onChange={(event) => {
                    if (isLanguage(event.target.value)) {
                      savePreference(
                        LANGUAGE_STORAGE_KEY,
                        event.target.value,
                        setLanguage
                      );
                    }
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
                >
                  {LANGUAGES.map((option) => (
                    <option key={option} value={option}>
                      {LANGUAGE_NAMES[option]}
                    </option>
                  ))}
                </select>
              </label>
              <div ref={appearancePanelRef} className="relative z-[100]">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label={t('appearanceSettings')}
                  aria-expanded={appearanceOpen}
                  aria-controls="appearance-menu"
                  onClick={() => setAppearanceOpen((open) => !open)}
                >
                  <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
                  <span className="ml-2">{t('appearance')}</span>
                </button>
                {appearanceOpen && (
                  <section
                    id="appearance-menu"
                    className="absolute right-0 z-[100] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900"
                    aria-label={t('appearanceSettings')}
                  >
                    <button
                      type="button"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => {
                        const nextTheme = theme === 'dark' ? 'light' : 'dark';
                        savePreference(THEME_STORAGE_KEY, nextTheme, setTheme);
                      }}
                    >
                      {t(theme === 'dark' ? 'toggleLight' : 'toggleDark')}
                    </button>
                    <div className="mt-3">
                      <label
                        htmlFor="color-theme"
                        className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        {t('theme')}
                      </label>
                      <select
                        id="color-theme"
                        value={colorTheme}
                        onChange={(event) => {
                          if (isColorThemeId(event.target.value)) {
                            savePreference(
                              COLOR_THEME_STORAGE_KEY,
                              event.target.value,
                              setColorTheme
                            );
                          }
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
                      >
                        {COLOR_THEMES.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {t(preset.label)}
                          </option>
                        ))}
                      </select>
                      <label
                        htmlFor="font-style"
                        className="mb-1.5 mt-3 block text-sm font-medium text-slate-700 dark:text-slate-200"
                      >
                        {t('font')}
                      </label>
                      <select
                        id="font-style"
                        value={fontStyle}
                        onChange={(event) =>
                          savePreference(
                            FONT_STORAGE_KEY,
                            event.target.value,
                            setFontStyle
                          )
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
                      >
                        <option value="system">{t('fontSystem')}</option>
                        <option value="rounded">{t('fontRounded')}</option>
                        <option value="pixel">{t('fontPixel')}</option>
                        <option value="serif">{t('fontSerif')}</option>
                      </select>
                      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t('backgroundTitle')}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('backgroundHelp')}
                      </p>
                      <input
                        ref={backgroundInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        aria-label={t('backgroundTitle')}
                        onChange={(event) => {
                          void saveBackground(event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        className="mt-3 w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                        onClick={() => backgroundInputRef.current?.click()}
                      >
                        {t('chooseImage')}
                      </button>
                      {backgroundImage && (
                        <button
                          type="button"
                          className="mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-500 dark:text-rose-300 dark:hover:bg-rose-950"
                          onClick={removeBackground}
                        >
                          {t('removeBackground')}
                        </button>
                      )}
                      {backgroundError && (
                        <p
                          className="mt-2 text-xs text-rose-600 dark:text-rose-400"
                          role="alert"
                        >
                          {backgroundError}
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">{t('searchLabel')}</span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                ⌕
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900 dark:focus:ring-indigo-950"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>{t('tagFilter')}</span>
              <select
                value={selectedTag}
                onChange={(event) =>
                  setSelectedTag(event.target.value as BoardTag | 'all')
                }
                className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
              >
                <option value="all">{t('allTags')}</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span>{t('completionFilter')}</span>
              <select
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'all' ||
                    value === 'completed' ||
                    value === 'pending'
                  ) {
                    setStatusFilter(value);
                  }
                }}
                className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-indigo-950"
              >
                <option value="all">{t('filterAll')}</option>
                <option value="completed">{t('filterCompleted')}</option>
                <option value="pending">{t('filterPending')}</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={undo}
                disabled={pastLength === 0}
                aria-label={t('undoLabel')}
              >
                <span aria-hidden="true">↶</span>
                <span className="ml-1.5">{t('undo')}</span>
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={redo}
                disabled={futureLength === 0}
                aria-label={t('redoLabel')}
              >
                <span aria-hidden="true">↷</span>
                <span className="ml-1.5">{t('redo')}</span>
              </button>
            </div>
          </div>
          {saveError && (
            <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
              {t('saveFailedPrefix')} {saveError}
            </p>
          )}
          <p className="sr-only">
            {t('shortcuts')}
          </p>
        </div>
      </header>

      <Board
        language={language}
        searchQuery={searchQuery}
        selectedTag={selectedTag}
        statusFilter={statusFilter}
        onCreateCard={openCreateModal}
        onEditCard={openEditModal}
      />

      <footer className="mt-auto border-t border-slate-200 bg-white/95 px-4 py-4 text-sm text-slate-600 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-300 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Denis Durnov</p>
          <address className="flex flex-wrap gap-x-4 not-italic">
            <a
              className="hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-indigo-300"
              href="https://t.me/goviks"
              target="_blank"
              rel="noreferrer"
            >
              Telegram: @goviks
            </a>
            <a
              className="hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-indigo-300"
              href="mailto:goviks@yandex.ru"
            >
              goviks@yandex.ru
            </a>
            <a
              className="hover:text-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-indigo-300"
              href="https://hh.ru/resume/9680e743ff114a1e9b0039ed1f734957555442"
              target="_blank"
              rel="noreferrer"
            >
              {t('resume')}
            </a>
          </address>
        </div>
      </footer>

      {modalState && (
        <CardModal
          key={modalState.card?.id ?? `new-${modalState.columnId}`}
          card={modalState.card}
          availableTags={availableTags}
          language={language}
          onSave={saveCard}
          onClose={() => setModalState(null)}
        />
      )}
      {!userName && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <section
            aria-labelledby="profile-setup-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            role="dialog"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
              {t('profileKicker')}
            </p>
            <h2
              id="profile-setup-title"
              className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              {t('profileQuestion')}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {t('profileHelp')}
            </p>
            <form className="mt-5 space-y-3" onSubmit={saveProfileName}>
              <label className="sr-only" htmlFor="profile-name">
                {t('profileLabel')}
              </label>
              <input
                id="profile-name"
                autoFocus
                required
                maxLength={40}
                value={profileNameInput}
                onChange={(event) => setProfileNameInput(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
                placeholder={t('profilePlaceholder')}
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
              >
                {t('profileSubmit')}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
