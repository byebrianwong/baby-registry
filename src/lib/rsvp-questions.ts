// RSVP questions (#100): what a host asks guests besides how many are coming.
// Meal choice, dietary needs, the names of plus-ones, or a question of the
// host's own, each required or optional. The questions live on
// events.rsvp_questions and each guest's answers on event_guests.answers
// (supabase/migrations/20261112053850_rsvp_questions_and_messages.sql).
//
// This file has no imports, so the browser, the server and tests can all use it.

export type QuestionKind = "meal" | "diet" | "plus_ones" | "text";

export interface RsvpQuestion {
  /** Short and unique within the event. Answers are stored under it. */
  id: string;
  kind: QuestionKind;
  /** What the guest reads: "Meal choice", "Any allergies?". */
  label: string;
  required: boolean;
  /** The choices, for a meal question. */
  options: string[];
}

/** A guest's answers, by question id. A meal or plus-ones answer has one entry per person. */
export type RsvpAnswers = Record<string, string | string[]>;

export const MAX_QUESTIONS = 8;
export const MAX_QUESTION_LABEL_LENGTH = 120;
export const MAX_OPTIONS = 8;
export const MAX_OPTION_LENGTH = 60;
export const MAX_ANSWER_LENGTH = 500;
export const MAX_NAME_LENGTH = 100;

export const QUESTION_KINDS: Record<QuestionKind, { label: string; hint: string; defaultLabel: string; defaultOptions: string[] }> = {
  meal: {
    label: "Meal choice",
    hint: "Each person coming picks one",
    defaultLabel: "Meal choice",
    defaultOptions: ["Chicken", "Fish", "Vegetarian"],
  },
  diet: {
    label: "Dietary needs",
    hint: "Allergies, vegetarian, gluten-free",
    defaultLabel: "Allergies or dietary needs",
    defaultOptions: [],
  },
  plus_ones: {
    label: "Names of plus-ones",
    hint: "The name of each person they bring",
    defaultLabel: "Who's coming with you?",
    defaultOptions: [],
  },
  text: {
    label: "Your own question",
    hint: "Anything else you'd like to know",
    defaultLabel: "",
    defaultOptions: [],
  },
};

export const QUESTION_KIND_IDS = Object.keys(QUESTION_KINDS) as QuestionKind[];

export function isQuestionKind(value: unknown): value is QuestionKind {
  return typeof value === "string" && value in QUESTION_KINDS;
}

const ID_PATTERN = /^[a-z0-9_]{1,16}$/;

/** A new question of this kind, with its usual wording. */
export function newQuestion(kind: QuestionKind, id: string, required = false): RsvpQuestion {
  const preset = QUESTION_KINDS[kind];
  return { id, kind, label: preset.defaultLabel, required, options: [...preset.defaultOptions] };
}

/**
 * The questions a new event of an occasion starts with. Ids are the kind's
 * name, which is unique since each kind appears once.
 */
export function defaultQuestions(kinds: readonly QuestionKind[] | undefined): RsvpQuestion[] {
  return (kinds ?? []).map((kind) => newQuestion(kind, kind, kind !== "diet"));
}

/** The questions as the host sent them, trimmed and checked. */
export function cleanQuestions(raw: unknown): { questions: RsvpQuestion[] } | { error: string } {
  if (!Array.isArray(raw)) return { error: "The RSVP questions didn't come through. Try again." };
  if (raw.length > MAX_QUESTIONS) return { error: `An event can ask up to ${MAX_QUESTIONS} questions.` };
  const questions: RsvpQuestion[] = [];
  const ids = new Set<string>();
  for (const item of raw) {
    const id = typeof item?.id === "string" ? item.id : "";
    if (!ID_PATTERN.test(id) || ids.has(id)) return { error: "The RSVP questions didn't come through. Try again." };
    if (!isQuestionKind(item.kind)) return { error: "The RSVP questions didn't come through. Try again." };
    const label = typeof item.label === "string" ? item.label.trim().slice(0, MAX_QUESTION_LABEL_LENGTH) : "";
    if (!label) return { error: "Write each RSVP question, or remove the empty one." };
    let options: string[] = [];
    if (item.kind === "meal") {
      options = (Array.isArray(item.options) ? item.options : [])
        .map((o: unknown) => (typeof o === "string" ? o.trim().slice(0, MAX_OPTION_LENGTH) : ""))
        .filter(Boolean);
      options = [...new Set(options)].slice(0, MAX_OPTIONS);
      if (options.length < 2) return { error: `Give "${label}" at least two choices.` };
    }
    ids.add(id);
    questions.push({ id, kind: item.kind, label, required: item.required === true, options });
  }
  return { questions };
}

/** Reads questions saved on an event, skipping anything that doesn't fit. */
export function storedQuestions(raw: unknown): RsvpQuestion[] {
  const cleaned = cleanQuestions(Array.isArray(raw) ? raw : []);
  return "questions" in cleaned ? cleaned.questions : [];
}

/** How many names a plus-ones question asks for: everyone coming but the guest. */
export function plusOneCount(partySize: number): number {
  return Math.max(partySize - 1, 0);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * A guest's answers, checked against the questions. `partySize` is how many
 * people are coming, the guest included: a meal question takes one choice
 * each, and a plus-ones question one name for each person but the guest.
 */
export function readAnswers(
  questions: RsvpQuestion[],
  raw: unknown,
  partySize: number,
): { answers: RsvpAnswers } | { error: string } {
  const given = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const answers: RsvpAnswers = {};
  for (const question of questions) {
    const value = given[question.id];
    if (question.kind === "meal") {
      const list = Array.isArray(value) ? value : [];
      const picks = Array.from({ length: Math.max(partySize, 1) }, (_, i) => text(list[i], MAX_OPTION_LENGTH));
      if (picks.some((p) => p && !question.options.includes(p))) {
        return { error: `Choose one of the choices for "${question.label}".` };
      }
      if (question.required && picks.some((p) => !p)) {
        return { error: partySize > 1 ? `Choose "${question.label}" for each person.` : `Choose "${question.label}".` };
      }
      if (picks.some(Boolean)) answers[question.id] = picks;
    } else if (question.kind === "plus_ones") {
      const count = plusOneCount(partySize);
      if (count === 0) continue;
      const list = Array.isArray(value) ? value : [];
      const names = Array.from({ length: count }, (_, i) => text(list[i], MAX_NAME_LENGTH));
      if (question.required && names.some((n) => !n)) {
        return { error: count === 1 ? "Add the name of the person coming with you." : "Add the name of each person coming with you." };
      }
      if (names.some(Boolean)) answers[question.id] = names;
    } else {
      const answer = text(value, MAX_ANSWER_LENGTH);
      if (question.required && !answer) return { error: `Answer "${question.label}".` };
      if (answer) answers[question.id] = answer;
    }
  }
  return { answers };
}

/** Reads answers saved on a guest. */
export function storedAnswers(raw: unknown): RsvpAnswers {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const answers: RsvpAnswers = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string") answers[id] = value;
    else if (Array.isArray(value)) answers[id] = value.filter((v): v is string => typeof v === "string");
  }
  return answers;
}

/**
 * A guest's answers as lines to show: "Meal choice: Chicken, Fish". A meal
 * answer names each person when the plus-ones' names are known.
 */
export function answerLines(
  questions: RsvpQuestion[],
  answers: RsvpAnswers,
  guestName?: string,
): { label: string; value: string }[] {
  const plusOnes = questions.find((q) => q.kind === "plus_ones");
  const names = plusOnes && Array.isArray(answers[plusOnes.id]) ? (answers[plusOnes.id] as string[]) : [];
  const lines: { label: string; value: string }[] = [];
  for (const question of questions) {
    const value = answers[question.id];
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      const shown =
        question.kind === "meal" && names.some(Boolean)
          ? value
              .map((pick, i) => (pick ? `${i === 0 ? (guestName ?? "Guest") : names[i - 1] || `Guest ${i + 1}`}: ${pick}` : ""))
              .filter(Boolean)
              .join(", ")
          : value.filter(Boolean).join(", ");
      if (shown) lines.push({ label: question.label, value: shown });
    } else if (value) {
      lines.push({ label: question.label, value });
    }
  }
  return lines;
}

/** A question as a label before its answer: "Meal choice:", but "Who's coming with you?" as it is. */
export function answerLabel(label: string): string {
  return /[?:.!]$/.test(label.trim()) ? label.trim() : `${label.trim()}:`;
}

/** For each meal question, how many people chose each option, among guests who are going. */
export function mealCounts(
  questions: RsvpQuestion[],
  guests: { rsvp_status: string; answers: RsvpAnswers }[],
): { question: RsvpQuestion; counts: { option: string; count: number }[]; unanswered: number }[] {
  return questions
    .filter((q) => q.kind === "meal")
    .map((question) => {
      const counts = new Map(question.options.map((o) => [o, 0]));
      let unanswered = 0;
      for (const guest of guests.filter((g) => g.rsvp_status === "yes")) {
        const picks = guest.answers[question.id];
        if (!Array.isArray(picks) || picks.every((p) => !p)) {
          unanswered += 1;
          continue;
        }
        for (const pick of picks) if (counts.has(pick)) counts.set(pick, (counts.get(pick) ?? 0) + 1);
      }
      return { question, counts: [...counts].map(([option, count]) => ({ option, count })), unanswered };
    });
}
