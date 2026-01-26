import sortItemByDate from "../sortItemByDate";

describe("sortItemByDate", () => {
  test("sort threads by updatedAt in descending order", () => {
    const baseTime = Date.now();
    const threads = [
      { id: "1", title: "Thread 1", messages: [], updatedAt: baseTime },
      { id: "2", title: "Thread 2", messages: [], updatedAt: baseTime + 1000 },
      { id: "3", title: "Thread 3", messages: [], updatedAt: baseTime + 2000 },
    ];
    const sortedThreads = sortItemByDate(threads);
    expect(sortedThreads).toEqual([
      { id: "3", title: "Thread 3", messages: [], updatedAt: baseTime + 2000 },
      { id: "2", title: "Thread 2", messages: [], updatedAt: baseTime + 1000 },
      { id: "1", title: "Thread 1", messages: [], updatedAt: baseTime },
    ]);
  });

  test("sort notes by updatedAt in descending order", () => {
    const baseTime = Date.now();
    const notes = [
      {
        id: "1",
        title: "Note 1",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime,
      },
      {
        id: "2",
        title: "Note 2",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      },
      {
        id: "3",
        title: "Note 3",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime + 2000,
      },
    ];
    const sortedNotes = sortItemByDate(notes);
    expect(sortedNotes).toEqual([
      {
        id: "3",
        title: "Note 3",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime + 2000,
      },
      {
        id: "2",
        title: "Note 2",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      },
      {
        id: "1",
        title: "Note 1",
        content: "",
        folderId: "f1",
        createdAt: baseTime,
        updatedAt: baseTime,
      },
    ]);
  });

  test("does not mutate original array", () => {
    const baseTime = Date.now();
    const original = [
      { id: "1", updatedAt: baseTime },
      { id: "2", updatedAt: baseTime + 1000 },
    ];
    const originalCopy = [...original];
    sortItemByDate(original);
    expect(original).toEqual(originalCopy);
  });

  test("returns empty array when input is empty", () => {
    const result = sortItemByDate([]);
    expect(result).toEqual([]);
  });
});
