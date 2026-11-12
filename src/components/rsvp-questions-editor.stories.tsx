import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";
import { RsvpQuestionsEditor } from "./rsvp-questions-editor";
import { defaultQuestions, type RsvpQuestion } from "@/lib/rsvp-questions";

// The RSVP questions part of the event form, on its own.

function Editor({ initial }: { initial: RsvpQuestion[] }) {
  const [questions, setQuestions] = useState(initial);
  return <RsvpQuestionsEditor questions={questions} onChange={setQuestions} />;
}

const meta: Meta<typeof Editor> = {
  title: "Components/RsvpQuestionsEditor",
  component: Editor,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Editor>;

/** A wedding starts with meal choice, plus-ones' names and dietary needs. */
export const Wedding: Story = { args: { initial: defaultQuestions(["plus_ones", "meal", "diet"]) } };

/** No questions yet. Each kind can be added once, and your own questions any number of times. */
export const Empty: Story = {
  args: { initial: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Your own question" }));
    await expect(canvas.getByRole("textbox", { name: "Question" })).toBeVisible();
  },
};
