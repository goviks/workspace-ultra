import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { Language } from '../data/translations';
import { translate } from '../data/translations';
import type { BoardCard, BoardTag } from '../types/board';

interface CardModalProps {
  card: BoardCard | null;
  availableTags: BoardTag[];
  language: Language;
  onSave: (values: {
    title: string;
    description: string;
    tags: BoardTag[];
  }) => void;
  onClose: () => void;
}

export function CardModal({
  card,
  availableTags,
  language,
  onSave,
  onClose,
}: CardModalProps) {
  const [title, setTitle] = useState(card?.title ?? '');
  const [description, setDescription] = useState(card?.description ?? '');
  const [tags, setTags] = useState<BoardTag[]>(card?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    previousFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    titleRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus.current?.focus();
    };
  }, []);

  const toggleTag = (tag: BoardTag) => {
    setTags((currentTags) =>
      currentTags.includes(tag)
        ? currentTags.filter((currentTag) => currentTag !== tag)
        : [...currentTags, tag]
    );
  };

  const addTag = () => {
    const normalizedTag = newTag.trim();
    if (!normalizedTag) {
      return;
    }

    const existingTag = [...availableTags, ...tags].find(
      (tag) => tag.toLocaleLowerCase() === normalizedTag.toLocaleLowerCase()
    );

    if (existingTag) {
      setTags((currentTags) =>
        currentTags.includes(existingTag)
          ? currentTags
          : [...currentTags, existingTag]
      );
    } else {
      setTags((currentTags) => [...currentTags, normalizedTag]);
    }
    setNewTag('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      titleRef.current?.focus();
      return;
    }
    onSave({ title: normalizedTitle, description: description.trim(), tags });
  };

  const handleBackdropKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key === 'Escape') {
      onCloseRef.current();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCloseRef.current();
        }
      }}
      onKeyDown={handleBackdropKeyDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2
            id="card-modal-title"
            className="text-lg font-bold text-slate-900 dark:text-slate-100"
          >
            {translate(language, card ? 'dialogEdit' : 'dialogNew')}
          </h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-800"
            aria-label={translate(language, 'closeDialog')}
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="card-title"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {translate(language, 'title')}
            </label>
            <input
              ref={titleRef}
              id="card-title"
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
              placeholder={translate(language, 'titlePlaceholder')}
            />
          </div>
          <div>
            <label
              htmlFor="card-description"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {translate(language, 'description')}
            </label>
            <textarea
              id="card-description"
              rows={5}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
              placeholder={translate(language, 'descriptionPlaceholder')}
            />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              {translate(language, 'tags')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {[...new Set(tags)].map((tag) => (
                  <label
                    key={tag}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="accent-indigo-600"
                    />
                    {tag}
                  </label>
                ))}
            </div>
            <div className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="custom-tag">
                {translate(language, 'customTag')}
              </label>
              <input
                id="custom-tag"
                maxLength={32}
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-950"
                placeholder={translate(language, 'customTagPlaceholder')}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!newTag.trim()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {translate(language, 'add')}
              </button>
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onClose}
            >
              {translate(language, 'cancel')}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {translate(language, 'saveCard')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
