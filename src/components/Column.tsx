import { useEffect, useState, type FormEvent } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { Language } from '../data/translations';
import { translate } from '../data/translations';
import { Card } from './Card';
import type { BoardCard, BoardColumn } from '../types/board';

interface ColumnProps {
  column: BoardColumn;
  cards: BoardCard[];
  language: Language;
  searchQuery: string;
  isFiltered: boolean;
  draggable: boolean;
  onRename: (columnId: string, title: string) => void;
  onDelete: (columnId: string) => void;
  onCreateCard: (columnId: string) => void;
  onEditCard: (card: BoardCard) => void;
  onDeleteCard: (cardId: string) => void;
  onToggleCardCompletion: (cardId: string) => void;
}

export function Column({
  column,
  cards,
  language,
  searchQuery,
  isFiltered,
  draggable,
  onRename,
  onDelete,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onToggleCardCompletion,
}: ColumnProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [title, setTitle] = useState(column.title);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
    disabled: !draggable,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  });

  useEffect(() => {
    setTitle(column.title);
  }, [column.title]);

  const saveTitle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onRename(column.id, title);
    setIsRenaming(false);
  };

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
          : undefined,
        transition,
      }}
      className={`board-column flex w-full flex-col rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-900/5 transition dark:border-slate-700 dark:bg-slate-900/95 ${
        isDragging ? 'z-20 opacity-60' : ''
      }`}
      aria-label={`${translate(language, 'column')}: ${column.title}`}
    >
      <header className="mb-3 flex items-center gap-1.5">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="cursor-grab rounded p-1 text-slate-400 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 active:cursor-grabbing dark:hover:bg-slate-700"
          aria-label={`${translate(language, 'moveColumn')}: ${column.title}`}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true">⠿</span>
        </button>
        {isRenaming ? (
          <form className="min-w-0 flex-1" onSubmit={saveTitle}>
            <label className="sr-only" htmlFor={`rename-${column.id}`}>
              {translate(language, 'columnPlaceholder')}
            </label>
            <input
              id={`rename-${column.id}`}
              className="w-full rounded-md border border-indigo-400 bg-white px-2 py-1 text-sm font-semibold text-slate-800 outline-none ring-2 ring-indigo-100 dark:bg-slate-900 dark:text-slate-100 dark:ring-indigo-950"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => setIsRenaming(false)}
              autoFocus
            />
          </form>
        ) : (
          <div className="min-w-0 flex-1 px-1">
            <h2 className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">
              {column.title}
              <span className="ml-2 font-normal text-slate-500">
                {cards.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">
              {translate(language, 'columnCreated')}{' '}
              <time dateTime={column.createdAt}>
                {new Date(column.createdAt).toLocaleDateString(
                  language === 'zh'
                    ? 'zh-CN'
                    : language === 'en'
                      ? 'en-US'
                      : 'ru-RU',
                  { dateStyle: 'medium' }
                )}
              </time>
            </p>
          </div>
        )}
        <button
          type="button"
          className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white hover:text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          aria-label={`${translate(language, 'renameColumn')}: ${column.title}`}
          onClick={() => {
            setTitle(column.title);
            setIsRenaming(true);
          }}
        >
          <span aria-hidden="true">✎</span>
        </button>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-rose-100 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-rose-950 dark:hover:text-rose-300"
          aria-label={`${translate(language, 'deleteColumn')}: ${column.title}`}
          onClick={() => onDelete(column.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      <div
        ref={setDropRef}
        className={`card-list flex min-h-16 flex-col gap-2 rounded-xl p-0.5 ${
          isOver ? 'bg-indigo-100/70 dark:bg-indigo-950/60' : ''
        }`}
        aria-label={`${translate(language, 'columnCards')} ${column.title}`}
      >
        <SortableContext
          items={cards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              columnId={column.id}
              index={column.cards.findIndex((item) => item.id === card.id)}
              language={language}
              searchQuery={searchQuery}
              draggable={draggable}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
              onToggleCompletion={onToggleCardCompletion}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            {translate(language, isFiltered ? 'columnNoMatches' : 'emptyColumn')}
          </p>
        )}
      </div>

      <button
        type="button"
        className="mt-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-white hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-indigo-300"
        onClick={() => onCreateCard(column.id)}
      >
        <span aria-hidden="true" className="mr-2">
          +
        </span>
        {translate(language, 'addCard')}
      </button>
    </section>
  );
}
