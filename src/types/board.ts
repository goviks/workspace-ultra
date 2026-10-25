export type BoardTag = string;
export type CardStatusFilter = 'all' | 'completed' | 'pending';

export interface BoardCard {
  id: string;
  title: string;
  description: string;
  tags: BoardTag[];
  createdAt: string;
  completedAt?: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  createdAt: string;
  cards: BoardCard[];
}

export interface BoardData {
  columns: BoardColumn[];
}

export type CardUpdate = Partial<
  Pick<BoardCard, 'title' | 'description' | 'tags'>
>;

export type HydrationStatus = 'loading' | 'ready' | 'error';
export type SaveStatus = 'saved' | 'saving' | 'error';

export interface BoardRuntimeState {
  hydration: HydrationStatus;
  storageError: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
}

export interface BoardStore {
  board: BoardData;
  past: BoardData[];
  future: BoardData[];
  addColumn: (title: string) => string;
  renameColumn: (columnId: string, title: string) => void;
  removeColumn: (columnId: string) => void;
  reorderColumn: (columnId: string, targetIndex: number) => void;
  addCard: (
    columnId: string,
    initial?: Partial<Pick<BoardCard, 'title' | 'description' | 'tags'>>
  ) => string | null;
  updateCard: (cardId: string, updates: CardUpdate) => void;
  toggleCardCompletion: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  moveCard: (
    cardId: string,
    targetColumnId: string,
    targetIndex: number
  ) => void;
  undo: () => void;
  redo: () => void;
  resetBoard: () => void;
}
