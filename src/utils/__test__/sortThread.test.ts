import sortThread from "../sortThread";

describe("sortThread", () => {
  test("sort threads by updatedAt in descending order", () => {
    const threads = [
      { id: "1", title: "Thread 1", messages: [], updatedAt: Date.now() },
      { id: "2", title: "Thread 2", messages: [], updatedAt: Date.now() + 1 },
      { id: "3", title: "Thread 3", messages: [], updatedAt: Date.now() + 2 },
    ];
    const sortedThreads = sortThread(threads);
    expect(sortedThreads).toEqual([
      { id: "3", title: "Thread 3", messages: [], updatedAt: Date.now() + 2 },
      { id: "2", title: "Thread 2", messages: [], updatedAt: Date.now() + 1 },
      { id: "1", title: "Thread 1", messages: [], updatedAt: Date.now() },
    ]);
  });
});
