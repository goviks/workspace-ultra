import { create } from 'zustand';
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from 'zustand/middleware';
import {
  type BoardCard,
  type BoardData,
  type BoardRuntimeState,
  type BoardStore,
  type CardUpdate,
} from '../types/board';

const STORAGE_KEY = 'portfolio-kanban-board';
const HISTORY_LIMIT = 50;

const createEmptyBoard = (): BoardData => ({ columns: [] });

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isBoardData = (value: unknown): value is BoardData => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('columns' in value) ||
    !Array.isArray(value.columns)
  ) {
    return false;
  }

  return value.columns.every((column: unknown) => {
    if (
      typeof column !== 'object' ||
      column === null ||
      !('id' in column) ||
      typeof column.id !== 'string' ||
      !('title' in column) ||
      typeof column.title !== 'string' ||
      ('createdAt' in column && typeof column.createdAt !== 'string') ||
      !('cards' in column) ||
      !Array.isArray(column.cards)
    ) {
      return false;
    }

    return column.cards.every((card: unknown) => {
      if (
        typeof card !== 'object' ||
        card === null ||
        !('id' in card) ||
        typeof card.id !== 'string' ||
        !('title' in card) ||
        typeof card.title !== 'string' ||
        !('description' in card) ||
        typeof card.description !== 'string' ||
        !('createdAt' in card) ||
        typeof card.createdAt !== 'string' ||
        ('completedAt' in card && typeof card.completedAt !== 'string') ||
        !('tags' in card) ||
        !Array.isArray(card.tags)
      ) {
        return false;
      }

      return card.tags.every(
        (tag: unknown) => typeof tag === 'string' && tag.trim().length > 0
      );
    });
  });
};

const normalizeBoardData = (board: BoardData): BoardData => ({
  columns: board.columns.map((column) => ({
    ...column,
    createdAt: column.createdAt ?? new Date().toISOString(),
  })),
});

export const useBoardRuntimeStore = create<BoardRuntimeState>(() => ({
  hydration: 'loading',
  storageError: null,
  saveStatus: 'saved',
  saveError: null,
}));

let latestSave = 0;

const boardStorage: StateStorage = {
  getItem: async (name) => window.localStorage.getItem(name),
  setItem: async (name, value) => {
    const saveId = ++latestSave;
    useBoardRuntimeStore.setState({
      saveStatus: 'saving',
      saveError: null,
    });

    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    try {
      window.localStorage.setItem(name, value);
      if (saveId === latestSave) {
        useBoardRuntimeStore.setState({ saveStatus: 'saved' });
      }
    } catch (error) {
      if (saveId === latestSave) {
        useBoardRuntimeStore.setState({
          saveStatus: 'error',
          saveError: getErrorMessage(error),
        });
      }
    }
  },
  removeItem: async (name) => {
    window.localStorage.removeItem(name);
  },
};

interface PersistedBoardState {
  board: BoardData;
  past: BoardData[];
  future: BoardData[];
}

const isPersistedBoardState = (
  value: unknown
): value is PersistedBoardState => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('board' in value) ||
    !isBoardData(value.board) ||
    !('past' in value) ||
    !Array.isArray(value.past) ||
    !value.past.every(isBoardData) ||
    !('future' in value) ||
    !Array.isArray(value.future) ||
    !value.future.every(isBoardData)
  ) {
    return false;
  }

  return true;
};

export const useBoardStore = create<BoardStore>()(
  persist<BoardStore, [], [], PersistedBoardState>(
    (set, get) => {
      const commitBoard = (nextBoard: BoardData): void => {
        const { board, past } = get();

        if (board === nextBoard) {
          return;
        }

        set({
          board: nextBoard,
          past: [...past, board].slice(-HISTORY_LIMIT),
          future: [],
        });
      };

      return {
        board: createEmptyBoard(),
        past: [],
        future: [],

        addColumn: (title) => {
          const column = {
            id: crypto.randomUUID(),
            title: title.trim() || 'New column',
            createdAt: new Date().toISOString(),
            cards: [],
          };

          commitBoard({
            columns: [...get().board.columns, column],
          });

          return column.id;
        },

        renameColumn: (columnId, title) => {
          const normalizedTitle = title.trim();
          const { board } = get();
          const columnIndex = board.columns.findIndex(
            (column) => column.id === columnId
          );

          if (
            !normalizedTitle ||
            columnIndex < 0 ||
            board.columns[columnIndex].title === normalizedTitle
          ) {
            return;
          }

          const columns = [...board.columns];
          columns[columnIndex] = {
            ...columns[columnIndex],
            title: normalizedTitle,
          };
          commitBoard({ columns });
        },

        removeColumn: (columnId) => {
          const { board } = get();
          const columns = board.columns.filter(
            (column) => column.id !== columnId
          );

          if (columns.length !== board.columns.length) {
            commitBoard({ columns });
          }
        },

        reorderColumn: (columnId, targetIndex) => {
          const { board } = get();
          const sourceIndex = board.columns.findIndex(
            (column) => column.id === columnId
          );

          if (sourceIndex < 0 || board.columns.length < 2) {
            return;
          }

          const columns = [...board.columns];
          const [column] = columns.splice(sourceIndex, 1);
          const boundedIndex = Math.max(
            0,
            Math.min(targetIndex, columns.length)
          );

          if (sourceIndex === boundedIndex) {
            return;
          }

          columns.splice(boundedIndex, 0, column);
          commitBoard({ columns });
        },

        addCard: (columnId, initial) => {
          const { board } = get();
          const columnIndex = board.columns.findIndex(
            (column) => column.id === columnId
          );

          if (columnIndex < 0) {
            return null;
          }

          const card: BoardCard = {
            id: crypto.randomUUID(),
            title: initial?.title?.trim() || 'New card',
            description: initial?.description ?? '',
            tags: initial?.tags ? [...initial.tags] : [],
            createdAt: new Date().toISOString(),
          };
          const columns = [...board.columns];
          columns[columnIndex] = {
            ...columns[columnIndex],
            cards: [...columns[columnIndex].cards, card],
          };

          commitBoard({ columns });
          return card.id;
        },

        updateCard: (cardId, updates: CardUpdate) => {
          const { board } = get();
          let changed = false;

          const columns = board.columns.map((column) => {
            const cardIndex = column.cards.findIndex(
              (card) => card.id === cardId
            );

            if (cardIndex < 0) {
              return column;
            }

            const currentCard = column.cards[cardIndex];
            const nextCard: BoardCard = {
              ...currentCard,
              ...updates,
              tags: updates.tags ? [...updates.tags] : currentCard.tags,
              title: updates.title?.trim() ?? currentCard.title,
            };
            const tagsUnchanged =
              nextCard.tags.length === currentCard.tags.length &&
              nextCard.tags.every(
                (tag, index) => tag === currentCard.tags[index]
              );

            if (
              !nextCard.title ||
              (nextCard.title === currentCard.title &&
                nextCard.description === currentCard.description &&
                tagsUnchanged)
            ) {
              return column;
            }

            changed = true;
            const cards = [...column.cards];
            cards[cardIndex] = nextCard;
            return { ...column, cards };
          });

          if (changed) {
            commitBoard({ columns });
          }
        },

        toggleCardCompletion: (cardId) => {
          const { board } = get();
          let changed = false;
          const columns = board.columns.map((column) => {
            const cardIndex = column.cards.findIndex(
              (card) => card.id === cardId
            );
            if (cardIndex < 0) {
              return column;
            }

            const currentCard = column.cards[cardIndex];
            const nextCard: BoardCard = { ...currentCard };
            if (currentCard.completedAt) {
              delete nextCard.completedAt;
            } else {
              nextCard.completedAt = new Date().toISOString();
            }
            const cards = [...column.cards];
            cards[cardIndex] = nextCard;
            changed = true;
            return { ...column, cards };
          });

          if (changed) {
            commitBoard({ columns });
          }
        },

        removeCard: (cardId) => {
          const { board } = get();
          let changed = false;
          const columns = board.columns.map((column) => {
            const cards = column.cards.filter((card) => card.id !== cardId);

            if (cards.length === column.cards.length) {
              return column;
            }

            changed = true;
            return { ...column, cards };
          });

          if (changed) {
            commitBoard({ columns });
          }
        },

        moveCard: (cardId, targetColumnId, targetIndex) => {
          const { board } = get();
          const sourceColumnIndex = board.columns.findIndex((column) =>
            column.cards.some((card) => card.id === cardId)
          );
          const targetColumnIndex = board.columns.findIndex(
            (column) => column.id === targetColumnId
          );

          if (sourceColumnIndex < 0 || targetColumnIndex < 0) {
            return;
          }

          const sourceColumn = board.columns[sourceColumnIndex];
          const sourceCardIndex = sourceColumn.cards.findIndex(
            (card) => card.id === cardId
          );
          if (sourceCardIndex < 0) {
            return;
          }

          const card = sourceColumn.cards[sourceCardIndex];
          const columns = [...board.columns];
          columns[sourceColumnIndex] = {
            ...sourceColumn,
            cards: sourceColumn.cards.filter(
              (candidate) => candidate.id !== cardId
            ),
          };

          const targetColumn = columns[targetColumnIndex];
          const boundedIndex = Math.max(
            0,
            Math.min(targetIndex, targetColumn.cards.length)
          );

          if (
            sourceColumnIndex === targetColumnIndex &&
            sourceCardIndex === boundedIndex
          ) {
            return;
          }

          const cards = [...targetColumn.cards];
          cards.splice(boundedIndex, 0, card);
          columns[targetColumnIndex] = { ...targetColumn, cards };
          commitBoard({ columns });
        },

        undo: () => {
          const { board, past, future } = get();
          if (past.length === 0) {
            return;
          }

          set({
            board: past[past.length - 1],
            past: past.slice(0, -1),
            future: [board, ...future].slice(0, HISTORY_LIMIT),
          });
        },

        redo: () => {
          const { board, past, future } = get();
          if (future.length === 0) {
            return;
          }

          set({
            board: future[0],
            past: [...past, board].slice(-HISTORY_LIMIT),
            future: future.slice(1),
          });
        },

        resetBoard: () => {
          set({
            board: createEmptyBoard(),
            past: [],
            future: [],
          });
          useBoardRuntimeStore.setState({
            hydration: 'ready',
            storageError: null,
            saveStatus: 'saved',
            saveError: null,
          });
        },
      };
    },
    {
      name: STORAGE_KEY,
      storage: createJSONStorage<PersistedBoardState>(() => boardStorage),
      partialize: (state): PersistedBoardState => ({
        board: state.board,
        past: state.past,
        future: state.future,
      }),
      merge: (persistedState, currentState) => {
        if (!isPersistedBoardState(persistedState)) {
          throw new Error('Saved board data has an invalid format.');
        }

        return {
          ...currentState,
          board: normalizeBoardData(persistedState.board),
          past: persistedState.past.map(normalizeBoardData),
          future: persistedState.future.map(normalizeBoardData),
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          useBoardRuntimeStore.setState({
            hydration: 'error',
            storageError: getErrorMessage(error),
          });
          return;
        }

        useBoardRuntimeStore.setState({
          hydration: 'ready',
          storageError: null,
        });
      },
    }
  )
);
