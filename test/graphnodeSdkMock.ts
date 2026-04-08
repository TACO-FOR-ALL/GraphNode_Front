export class GraphNodeClient {}

export function createGraphNodeClient() {
  return {
    note: {
      getFolder: jest.fn(),
      getNote: jest.fn(),
      listNotes: jest.fn(),
      softDeleteNote: jest.fn(),
      restoreNote: jest.fn(),
      hardDeleteNote: jest.fn(),
      softDeleteFolder: jest.fn(),
    },
    conversations: {
      get: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn(),
    },
  };
}
