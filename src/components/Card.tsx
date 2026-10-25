import { useSortable } from '@dnd-kit/sortable';
import type { Language } from '../data/translations';
import { translate } from '../data/translations';
import type { BoardCard } from '../types/board';

interface CardProps {
  card: BoardCard;
  columnId: string;
  index: number;
  language: Language;
  searchQuery: string;
  draggable: boolean;
  onEdit: (card: BoardCard) => void;
  onDelete: (cardId: string) => void;
  onToggleCompletion: (cardId: string) => void;
}

const highlightText = (text: string, query: string) => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return text;
  }

  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'ig'));

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <mark
        className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-700"
        key={`${part}-${index}`}
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
};

export function Card({
  card,
  columnId,
  index,
  language,
  searchQuery,
  draggable,
  onEdit,
  onDelete,
  onToggleCompletion,
}: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id, columnId, index },
    disabled: !draggable,
  });

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
          : undefined,
        transition,
      }}
      className={`kanban-card group relative w-full shrink-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition dark:border-slate-700 dark:bg-slate-900 ${
        isDragging ? 'z-10 opacity-50' : ''
      } ${card.completedAt ? 'is-completed' : ''}`}
      aria-label={`${translate(language, 'card')}: ${card.title}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            card.completedAt
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 text-transparent hover:border-emerald-500 dark:border-slate-600'
          }`}
          aria-label={translate(
            language,
            card.completedAt ? 'markIncomplete' : 'markComplete'
          )}
          aria-pressed={Boolean(card.completedAt)}
          onClick={() => onToggleCompletion(card.id)}
        >
          <span aria-hidden="true" className="text-sm font-bold leading-none">
            ✓
          </span>
        </button>
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="mt-0.5 cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 active:cursor-grabbing dark:hover:bg-slate-800"
          aria-label={`${translate(language, 'moveCard')}: ${card.title}`}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        <button
          type="button"
          className={`min-w-0 flex-1 break-words text-left text-sm font-semibold text-slate-800 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-100 dark:hover:text-indigo-300 ${
            card.completedAt ? 'line-through decoration-rose-500' : ''
          }`}
          onClick={() => onEdit(card)}
        >
          {highlightText(card.title, searchQuery)}
        </button>
        <button
          type="button"
          className="rounded p-1 text-slate-400 opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 dark:hover:bg-rose-950"
          aria-label={`${translate(language, 'deleteCard')}: ${card.title}`}
          onClick={() => onDelete(card.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {card.description && (
        <p className="ml-8 mt-2 whitespace-pre-wrap break-words text-sm leading-5 text-slate-600 dark:text-slate-300">
          {highlightText(card.description, searchQuery)}
        </p>
      )}
      {card.completedAt && (
        <p className="ml-8 mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          {translate(language, 'completedOn')}{' '}
          <time dateTime={card.completedAt}>
            {new Date(card.completedAt).toLocaleString(
              language === 'zh'
                ? 'zh-CN'
                : language === 'en'
                  ? 'en-US'
                  : 'ru-RU',
              { dateStyle: 'medium', timeStyle: 'short' }
            )}
          </time>
        </p>
      )}
      <p className="ml-8 mt-2 text-xs text-slate-400 dark:text-slate-500">
        {translate(language, 'created')}{' '}
        <time dateTime={card.createdAt}>
          {new Date(card.createdAt).toLocaleString(
            language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'ru-RU',
            {
              dateStyle: 'medium',
              timeStyle: 'short',
            }
          )}
        </time>
      </p>
      {card.tags.length > 0 && (
        <ul
          className="ml-8 mt-3 flex flex-wrap gap-1.5"
          aria-label={translate(language, 'tags')}
        >
          {card.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
