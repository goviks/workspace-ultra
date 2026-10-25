import { useEffect, useState, type FormEvent } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useBoardStore } from '../store/boardStore';
import type { Language } from '../data/translations';
import { translate } from '../data/translations';
import type {
  BoardCard,
  BoardTag,
  CardStatusFilter,
} from '../types/board';
import { Column } from './Column';

interface BoardProps {
  language: Language;
  searchQuery: string;
  selectedTag: BoardTag | 'all';
  statusFilter: CardStatusFilter;
  onCreateCard: (columnId: string) => void;
  onEditCard: (card: BoardCard) => void;
}

interface DragData {
  type?: string;
  columnId?: string;
  cardId?: string;
  index?: number;
}

export function Board({
  language,
  searchQuery,
  selectedTag,
  statusFilter,
  onCreateCard,
  onEditCard,
}: BoardProps) {
  const board = useBoardStore((state) => state.board);
  const addColumn = useBoardStore((state) => state.addColumn);
  const renameColumn = useBoardStore((state) => state.renameColumn);
  const removeColumn = useBoardStore((state) => state.removeColumn);
  const reorderColumn = useBoardStore((state) => state.reorderColumn);
  const moveCard = useBoardStore((state) => state.moveCard);
  const removeCard = useBoardStore((state) => state.removeCard);
  const toggleCardCompletion = useBoardStore(
    (state) => state.toggleCardCompletion
  );
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [liveMessage, setLiveMessage] = useState('');
  const [laneCount, setLaneCount] = useState(() => {
    if (window.innerWidth >= 1536) return 5;
    if (window.innerWidth >= 1200) return 4;
    if (window.innerWidth >= 900) return 3;
    if (window.innerWidth >= 640) return 2;
    return 1;
  });
  const filtersActive =
    Boolean(searchQuery.trim()) ||
    selectedTag !== 'all' ||
    statusFilter !== 'all';

  useEffect(() => {
    const updateLaneCount = () => {
      const width = window.innerWidth;
      setLaneCount(
        width >= 1536
          ? 5
          : width >= 1200
            ? 4
            : width >= 900
              ? 3
              : width >= 640
                ? 2
                : 1
      );
    };

    window.addEventListener('resize', updateLaneCount);
    return () => window.removeEventListener('resize', updateLaneCount);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColumnId = (data: DragData | undefined): string | undefined => {
    if (!data) {
      return undefined;
    }
    if (data.type === 'column' || data.type === 'column-drop') {
      return data.columnId;
    }
    if (data.type === 'card') {
      return data.columnId;
    }
    return undefined;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as DragData | undefined;
    setLiveMessage(
      data?.type === 'column'
        ? translate(language, 'dragColumnStarted')
        : translate(language, 'dragCardStarted')
    );
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) {
      return;
    }
    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;
    if (activeData?.type === 'card' && overData?.type === 'column-drop') {
      const target = board.columns.find(
        (column) => column.id === overData.columnId
      );
      if (target) {
        setLiveMessage(
          `${translate(language, 'cardOverColumn')} ${target.title}.`
        );
      }
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || filtersActive) {
      setLiveMessage(translate(language, 'dragCancelled'));
      return;
    }

    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;

    if (activeData?.type === 'column') {
      const targetColumnId = getColumnId(overData);
      const targetIndex = board.columns.findIndex(
        (column) => column.id === targetColumnId
      );
      if (activeData.columnId && targetIndex >= 0) {
        reorderColumn(activeData.columnId, targetIndex);
        setLiveMessage(translate(language, 'columnsReordered'));
      }
      return;
    }

    if (activeData?.type === 'card' && activeData.cardId) {
      const targetColumnId = getColumnId(overData);
      if (!targetColumnId) {
        return;
      }

      const targetColumn = board.columns.find(
        (column) => column.id === targetColumnId
      );
      if (!targetColumn) {
        return;
      }

      let targetIndex = targetColumn.cards.length;
      if (overData?.type === 'card' && typeof overData.index === 'number') {
        targetIndex = overData.index;
      }
      moveCard(activeData.cardId, targetColumnId, targetIndex);
      setLiveMessage(
        `${translate(language, 'cardMovedTo')} ${targetColumn.title}.`
      );
    }
  };

  const createColumn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newColumnTitle.trim()) {
      return;
    }
    addColumn(newColumnTitle);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const visibleCards = (cards: BoardCard[]) =>
    cards.filter((card) => {
      const matchesTag = selectedTag === 'all' || card.tags.includes(selectedTag);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'completed' && Boolean(card.completedAt)) ||
        (statusFilter === 'pending' && !card.completedAt);
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
      const matchesSearch =
        !normalizedQuery ||
        card.title.toLocaleLowerCase().includes(normalizedQuery) ||
        card.description.toLocaleLowerCase().includes(normalizedQuery);
      return matchesTag && matchesSearch && matchesStatus;
    });

  const hasAnyVisibleCard = board.columns.some(
    (column) => visibleCards(column.cards).length > 0
  );
  const completedCards = board.columns
    .flatMap((column) =>
      column.cards
        .filter((card) => card.completedAt)
        .map((card) => ({ card, columnTitle: column.title }))
    )
    .sort(
      (first, second) =>
        new Date(second.card.completedAt ?? 0).getTime() -
        new Date(first.card.completedAt ?? 0).getTime()
    );
  const visibleColumns = board.columns
    .map((column) => ({ ...column, visibleCards: visibleCards(column.cards) }))
    .filter(
      (column) =>
        (statusFilter === 'all' && selectedTag === 'all') ||
        column.visibleCards.length > 0
    );
  const lanes = Array.from(
    { length: laneCount },
    () => [] as typeof visibleColumns
  );
  visibleColumns.forEach((column, index) => {
    lanes[index % laneCount].push(column);
  });

  return (
    <main className="min-h-0 flex-1 px-4 pb-5 pt-2 sm:px-6">
      {board.columns.length === 0 ? (
        <section className="mx-auto mt-16 max-w-lg rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {translate(language, 'emptyBoard')}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {translate(language, 'emptyBoardHelp')}
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            onClick={() =>
              addColumn(translate(language, 'defaultColumnTitle'))
            }
          >
            {translate(language, 'createFirstColumn')}
          </button>
        </section>
      ) : (
        <>
          <details className="mx-auto mb-4 w-full max-w-[1600px] overflow-hidden rounded-xl border border-emerald-200 bg-white/90 shadow-sm dark:border-emerald-900 dark:bg-slate-900/90">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-emerald-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 dark:text-slate-100 dark:hover:bg-emerald-950/30">
              <span className="mr-2 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                ✓
              </span>
              {translate(language, 'completedTasks')} ({completedCards.length})
            </summary>
            {completedCards.length > 0 ? (
              <ul className="divide-y divide-emerald-100 border-t border-emerald-100 dark:divide-emerald-950 dark:border-emerald-950">
                {completedCards.map(({ card, columnTitle }) => (
                  <li
                    key={card.id}
                    className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {card.title}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {translate(language, 'completedByColumn')} {columnTitle}
                      {card.completedAt && (
                        <>
                          {' · '}
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
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-emerald-100 px-4 py-3 text-sm text-slate-500 dark:border-emerald-950 dark:text-slate-400">
                {translate(language, 'noCompletedTasks')}
              </p>
            )}
          </details>
          {filtersActive && !hasAnyVisibleCard && (
            <p className="mb-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              {translate(language, 'noMatches')}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() =>
              setLiveMessage(translate(language, 'dragCancelled'))
            }
          >
            <SortableContext
              items={visibleColumns.map((column) => column.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="board-columns mx-auto w-full max-w-[1600px] gap-4 pb-3"
                style={{
                  gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))`,
                }}
              >
                {lanes.map((lane, laneIndex) => (
                  <div className="board-lane" key={`lane-${laneIndex}`}>
                    {lane.map((column) => (
                      <Column
                        key={column.id}
                        column={column}
                        cards={column.visibleCards}
                        language={language}
                        searchQuery={searchQuery}
                        isFiltered={filtersActive}
                        draggable={!filtersActive}
                        onRename={renameColumn}
                        onDelete={removeColumn}
                        onCreateCard={onCreateCard}
                        onEditCard={onEditCard}
                        onDeleteCard={removeCard}
                        onToggleCardCompletion={toggleCardCompletion}
                      />
                    ))}
                    {laneIndex === visibleColumns.length % laneCount && (
                      <div className="add-column-cell">
                        {isAddingColumn ? (
                          <form
                            className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800"
                            onSubmit={createColumn}
                          >
                            <label
                              className="sr-only"
                              htmlFor="new-column-title"
                            >
                              {translate(language, 'addColumnTitle')}
                            </label>
                            <input
                              id="new-column-title"
                              autoFocus
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-950"
                              placeholder={translate(
                                language,
                                'columnPlaceholder'
                              )}
                              value={newColumnTitle}
                              onChange={(event) =>
                                setNewColumnTitle(event.target.value)
                              }
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="submit"
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                              >
                                {translate(language, 'add')}
                              </button>
                              <button
                                type="button"
                                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-700"
                                onClick={() => {
                                  setIsAddingColumn(false);
                                  setNewColumnTitle('');
                                }}
                              >
                                {translate(language, 'cancel')}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-4 text-left text-sm font-semibold text-slate-600 transition hover:border-indigo-400 hover:bg-white hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
                            onClick={() => setIsAddingColumn(true)}
                          >
                            <span aria-hidden="true" className="mr-2">
                              +
                            </span>
                            {translate(language, 'addColumn')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {liveMessage}
            </p>
          </DndContext>
        </>
      )}
    </main>
  );
}
