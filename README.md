# AI Workflow System

A visual AI workflow system where each decision node asks an AI question and returns either **YES** or **NO**. The result determines which connected path the workflow follows.

Workflow execution is handled by **Inngest**, while the workflow is created and visualized using **React Flow**.

## Features

- Visual workflow editor
- AI decision nodes
- Editable decision prompts
- YES and NO branching
- Dynamic workflow traversal
- Inngest-based workflow execution
- OpenAI integration
- Mock AI mode for development and testing
- Execution status tracking
- Execution log panel
- Local workflow persistence
- JSON workflow export
- JSON workflow import
- Reset workflow functionality

## Tech Stack

- Next.js
- React
- TypeScript
- React Flow (`@xyflow/react`)
- Inngest
- OpenAI SDK
- Tailwind CSS
- Shadcn
- LocalStorage

## How It Works

Each workflow node represents an AI decision.

For example:

```text
                 YES
                  |
                  v
        Technical Support
       /
Support Request?
       \
        \
         NO
          |
          v
       Sales Inquiry