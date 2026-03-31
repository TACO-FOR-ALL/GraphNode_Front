import {
  mapConversation,
  mapFolder,
  mapGraphEdge,
  mapGraphNode,
  mapMessage,
  mapNote,
} from "../dtoMappers";

describe("dtoMappers", () => {
  test("mapGraphNode and mapGraphEdge normalize optional timestamps", () => {
    expect(
      mapGraphNode({
        id: 1,
        userId: "user-1",
        origId: "orig-1",
        clusterId: "cluster-1",
        clusterName: "Cluster",
        timestamp: null,
        numMessages: 3,
        sourceType: "chat",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: undefined,
      }),
    ).toEqual(
      expect.objectContaining({
        id: 1,
        x: 0,
        y: 0,
        edgeCount: 0,
        timestamp: null,
        createdAt: new Date("2024-01-01T00:00:00.000Z").getTime(),
        updatedAt: undefined,
      }),
    );

    expect(
      mapGraphEdge({
        id: "edge-1",
        userId: "user-1",
        source: 1,
        target: 2,
        weight: 0.7,
        type: "insight",
        intraCluster: true,
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: undefined,
      }),
    ).toEqual(
      expect.objectContaining({
        id: "edge-1",
        isIntraCluster: true,
        createdAt: new Date("2024-01-02T00:00:00.000Z").getTime(),
        updatedAt: undefined,
      }),
    );
  });

  test("mapNote and mapFolder convert required ISO dates to timestamps", () => {
    expect(
      mapNote({
        id: "note-1",
        title: "Title",
        content: "Content",
        folderId: null,
        createdAt: "2024-02-01T00:00:00.000Z",
        updatedAt: "2024-02-02T00:00:00.000Z",
      }),
    ).toEqual({
      id: "note-1",
      title: "Title",
      content: "Content",
      folderId: null,
      createdAt: new Date("2024-02-01T00:00:00.000Z").getTime(),
      updatedAt: new Date("2024-02-02T00:00:00.000Z").getTime(),
    });

    expect(
      mapFolder({
        id: "folder-1",
        name: "Folder",
        parentId: null,
        createdAt: "2024-03-01T00:00:00.000Z",
        updatedAt: "2024-03-02T00:00:00.000Z",
      }),
    ).toEqual({
      id: "folder-1",
      name: "Folder",
      parentId: null,
      createdAt: new Date("2024-03-01T00:00:00.000Z").getTime(),
      updatedAt: new Date("2024-03-02T00:00:00.000Z").getTime(),
    });
  });

  test("mapMessage and mapConversation filter deleted messages and use fallback time", () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(123456789);

    expect(
      mapMessage({
        id: "message-1",
        role: "assistant",
        content: "Hello",
        createdAt: undefined,
      }),
    ).toEqual({
      id: "message-1",
      role: "assistant",
      content: "Hello",
      ts: 123456789,
    });

    expect(
      mapConversation({
        id: "thread-1",
        title: "Thread",
        createdAt: "2024-04-01T00:00:00.000Z",
        updatedAt: undefined,
        deletedAt: null,
        messages: [
          {
            id: "visible",
            role: "user",
            content: "Keep me",
            createdAt: "2024-04-01T00:00:01.000Z",
            deletedAt: null,
          },
          {
            id: "deleted",
            role: "assistant",
            content: "Remove me",
            createdAt: "2024-04-01T00:00:02.000Z",
            deletedAt: "2024-04-01T00:00:03.000Z",
          },
        ],
      }),
    ).toEqual({
      id: "thread-1",
      title: "Thread",
      messages: [
        {
          id: "visible",
          role: "user",
          content: "Keep me",
          ts: new Date("2024-04-01T00:00:01.000Z").getTime(),
        },
      ],
      updatedAt: 123456789,
    });

    nowSpy.mockRestore();
  });
});
