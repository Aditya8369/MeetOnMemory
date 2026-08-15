import { jest } from "@jest/globals";

// Mock the Client class BEFORE importing the service
jest.unstable_mockModule("@notionhq/client", () => {
  return {
    Client: jest.fn().mockImplementation(() => {
      return {
        pages: {
          create: jest
            .fn()
            .mockResolvedValue({
              id: "mock-page-id",
              url: "https://notion.so/mock",
            }),
        },
      };
    }),
  };
});

describe("Notion Sync Service", () => {
  let Client;
  let createMeetingPage;

  beforeAll(async () => {
    const notionClientModule = await import("@notionhq/client");
    Client = notionClientModule.Client;
    const serviceModule = await import("../services/notionSyncService.js");
    createMeetingPage = serviceModule.createMeetingPage;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a notion page with meeting details", async () => {
    const meeting = {
      title: "Quarterly Review",
      fileUrl: "http://example.com/recording.mp4",
      summary: "Discussed Q1 results and Q2 goals.",
      structuredMoM: {
        actionItems: [
          { task: "Update roadmap", assignee: "Alice", dueDate: "Friday" },
        ],
      },
    };

    const integration = {
      targetDatabaseId: "mock-db-id",
      accessToken: "mock-token",
    };

    const response = await createMeetingPage(meeting, integration);

    expect(response).toBeDefined();
    expect(response.id).toBe("mock-page-id");

    // Check if the Client was instantiated correctly
    expect(Client).toHaveBeenCalledWith({ auth: "mock-token" });

    // Assuming we can access the mocked instance
    const mockClientInstance = Client.mock.results[0].value;
    expect(mockClientInstance.pages.create).toHaveBeenCalled();

    const createArgs = mockClientInstance.pages.create.mock.calls[0][0];
    expect(createArgs.parent.database_id).toBe("mock-db-id");

    // Check if blocks are mapped
    const children = createArgs.children;
    expect(children.length).toBeGreaterThan(0);

    // Action item should exist
    const actionItemBlock = children.find((child) => child.type === "to_do");
    expect(actionItemBlock).toBeDefined();
    expect(actionItemBlock.to_do.rich_text[0].text.content).toContain(
      "Update roadmap",
    );
  });
});
