import { inngest } from "./client";

export const testFunction = inngest.createFunction(
  {
    id: "test-workflow",
    triggers: {
      event: "workflow/test",
    },
  },
  async ({ event, step }) => {
    return await step.run("hello", async () => {
      return {
        message: "Inngest is working",
        received: event.data,
      };
    });
  },
);