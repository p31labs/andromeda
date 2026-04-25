import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocialCommand } from "../commands/social";
import { Message } from "discord.js";
import { createCommandRegistry, CommandContext } from "../commands/base";

describe("SocialCommand", () => {
  let command: SocialCommand;
  let mockMessage: Partial<Message>;
  let mockReply: any;

  beforeEach(() => {
    command = new SocialCommand();
    mockReply = vi.fn();
    mockMessage = {
      reply: mockReply,
    } as Partial<Message>;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("showHelp", () => {
    it("should display help with all commands", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: [],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });
  });

  describe("showTemplates", () => {
    it("should display all templates", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["templates"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });

    it("should filter templates by pillar", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["templates", "creation"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });
  });

  describe("showDashboard", () => {
    it("should display dashboard", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["dashboard"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });
  });

  describe("handleCreate", () => {
    it("should show create help when no template specified", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["create"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });

    it("should show template with missing variables", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["create", "creation_code_drop"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });

    it("should build content from template with variables", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["create", "creation_code_drop", "project_name=Test", "feature=Auth", "language=TypeScript", "repo_link=https://github.com/test"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });
  });

  describe("listWaves", () => {
    it("should list available waves", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          waves: [
            { id: "weekly_update", title: "Weekly Update", platforms: ["twitter"] }
          ]
        }),
      });
      global.fetch = mockFetch as any;

      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["waves"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockFetch).toHaveBeenCalledWith("https://social.p31ca.org/waves");
      expect(mockReply).toHaveBeenCalled();
    });
  });

  describe("handleBroadcast", () => {
    it("should require content for broadcast", async () => {
      const context: CommandContext = {
        message: mockMessage as Message,
        args: ["broadcast"],
        prefix: "p31",
        apiUrls: {} as any,
        timeout: 5000,
      };

      await command.execute(context);

      expect(mockReply).toHaveBeenCalled();
    });
  });
});
