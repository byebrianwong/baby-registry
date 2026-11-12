"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { NativeSelect } from "@/components/base/select/select-native";
import { sendEventMessage } from "@/lib/actions/event-messages";
import {
  MAX_MESSAGE_BODY_LENGTH,
  MAX_MESSAGE_SUBJECT_LENGTH,
  MESSAGE_AUDIENCES,
  type EventMessage,
  type MessageAudience,
} from "@/lib/event-updates";

type SendAction = (
  eventId: string,
  input: { audience: MessageAudience; subject: string; body: string },
) => Promise<{ error: string | null; sent?: number }>;

const KIND_LABELS: Record<EventMessage["kind"], string> = {
  message: "Message",
  change: "New details",
  reminder: "Day-before reminder",
};

function formatSent(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface GuestMessagesProps {
  eventId: string;
  eventTitle: string;
  /** How many guests with an email each audience reaches now. */
  counts: Record<MessageAudience, number>;
  /** What was emailed to guests after the invitation, newest first. */
  messages: EventMessage[];
  /** Whether the day-before reminder is on. */
  remindDayBefore: boolean;
  /** Where Edit goes, to turn the reminder on or off. */
  editHref: string;
  sendAction?: SendAction;
}

/**
 * Emailing guests after the invitation: "Message everyone going", and a list
 * of what went out, including the automatic emails about a new date, time or
 * place and the day-before reminder.
 */
export function GuestMessages({
  eventId,
  eventTitle,
  counts,
  messages,
  remindDayBefore,
  editHref,
  sendAction = sendEventMessage,
}: GuestMessagesProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<MessageAudience>("going");
  const [subject, setSubject] = useState(`About ${eventTitle}`.slice(0, MAX_MESSAGE_SUBJECT_LENGTH));
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write your message.");
      return;
    }
    setSending(true);
    setError("");
    const result = await sendAction(eventId, { audience, subject, body });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    toast.success(`Sent to ${result.sent === 1 ? "1 guest" : `${result.sent} guests`}`);
    setOpen(false);
    setBody("");
    router.refresh();
  };

  return (
    <Card className="py-0">
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <Mail aria-hidden="true" className="size-4.5 text-brand-600" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-medium text-primary">Messages to guests</p>
            <p className="text-sm text-tertiary">
              {remindDayBefore
                ? "Everyone going gets a reminder the day before. "
                : "The day-before reminder is off. "}
              <a href={editHref} className="font-medium text-brand-600 hover:underline">
                Change
              </a>
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen(true)} disabled={counts.not_declined === 0}>
          <span className="inline-flex items-center gap-1.5">
            <Send className="size-4" />
            Message everyone going
          </span>
        </Button>
        {messages.length > 0 && (
          <ul className="flex flex-col gap-2 border-t border-secondary pt-3">
            {messages.map((message) => (
              <li key={message.id} className="text-sm">
                <p className="truncate font-medium text-primary">{message.subject}</p>
                <p className="text-tertiary">
                  {KIND_LABELS[message.kind]} · {formatSent(message.created_at)} ·{" "}
                  {message.recipients === 1 ? "1 guest" : `${message.recipients} guests`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message guests</DialogTitle>
            <DialogDescription>
              It goes by email, with each guest&apos;s own RSVP link. Replies come to you.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={send} className="flex flex-col gap-4">
            <NativeSelect
              label="Send to"
              value={audience}
              onChange={(e) => setAudience(e.target.value as MessageAudience)}
              options={(Object.keys(MESSAGE_AUDIENCES) as MessageAudience[]).map((value) => ({
                value,
                label: `${MESSAGE_AUDIENCES[value].label} (${counts[value]})`,
              }))}
            />
            <Input
              label="Subject"
              value={subject}
              onChange={setSubject}
              maxLength={MAX_MESSAGE_SUBJECT_LENGTH}
              isRequired
            />
            <TextArea
              label="Message"
              value={body}
              onChange={setBody}
              rows={5}
              maxLength={MAX_MESSAGE_BODY_LENGTH}
              placeholder="Parking is behind the building. See you Saturday!"
              isRequired
            />
            {error && (
              <p role="alert" className="text-sm text-error-primary">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" disabled={sending || counts[audience] === 0}>
                <span className="inline-flex items-center gap-1.5">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {sending ? "Sending…" : `Send to ${counts[audience] === 1 ? "1 guest" : `${counts[audience]} guests`}`}
                </span>
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
