"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  MAX_QUESTION_LABEL_LENGTH,
  QUESTION_KINDS,
  QUESTION_KIND_IDS,
  newQuestion,
  type QuestionKind,
  type RsvpQuestion,
} from "@/lib/rsvp-questions";

/** A short random id for a question of the host's own. */
function newId(): string {
  return `q${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The host's RSVP questions on the event form: meal choice, dietary needs,
 * names of plus-ones, or a question of their own, each required or optional.
 */
export function RsvpQuestionsEditor({
  questions,
  onChange,
}: {
  questions: RsvpQuestion[];
  onChange: (questions: RsvpQuestion[]) => void;
}) {
  const update = (id: string, changes: Partial<RsvpQuestion>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...changes } : q)));
  const remove = (id: string) => onChange(questions.filter((q) => q.id !== id));
  // Meal, diet and plus-ones make sense once each. Questions of your own, any number.
  const addable = QUESTION_KIND_IDS.filter((kind) => kind === "text" || !questions.some((q) => q.kind === kind));
  const add = (kind: QuestionKind) => onChange([...questions, newQuestion(kind, kind === "text" ? newId() : kind)]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-secondary">Questions</p>
        <p className="text-sm text-tertiary">Guests who are coming answer these when they RSVP. You see the answers on the guest list.</p>
      </div>
      {questions.length > 0 && (
        <ul className="flex flex-col gap-3">
          {questions.map((question) => (
            <li key={question.id} className="flex flex-col gap-3 rounded-xl border border-secondary p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-wide text-tertiary uppercase">
                  {QUESTION_KINDS[question.kind].label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove "${question.label || QUESTION_KINDS[question.kind].label}"`}
                  onClick={() => remove(question.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Input
                label="Question"
                value={question.label}
                onChange={(label) => update(question.id, { label })}
                maxLength={MAX_QUESTION_LABEL_LENGTH}
                placeholder={question.kind === "text" ? "What song gets you dancing?" : undefined}
              />
              {question.kind === "meal" && (
                <Input
                  label="Choices"
                  hint={`Separate them with commas. Up to ${MAX_OPTIONS}.`}
                  value={question.options.join(", ")}
                  onChange={(value) => update(question.id, { options: value.split(",").map((o) => o.trimStart()) })}
                  placeholder="Chicken, Fish, Vegetarian"
                />
              )}
              <Checkbox
                isSelected={question.required}
                onChange={(required) => update(question.id, { required })}
                label={<span className="font-normal">Guests must answer</span>}
              />
            </li>
          ))}
        </ul>
      )}
      {questions.length < MAX_QUESTIONS && (
        <div className="flex flex-wrap gap-2">
          {addable.map((kind) => (
            <Button key={kind} type="button" variant="outline" size="sm" onClick={() => add(kind)}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-4" />
                {QUESTION_KINDS[kind].label}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
