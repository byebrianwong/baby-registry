import type { Meta, StoryObj } from "@storybook/react";
import { GroupGiftPage, type GroupGiftPageActions } from "./group-gift-page";
import type { GroupGiftView, GroupGiftViewer } from "@/lib/group-gifts";

// Server actions can't run in Storybook, so these pretend to succeed after a
// moment. The page shows each change straight away.
const wait = () => new Promise((resolve) => setTimeout(resolve, 400));
const actions: GroupGiftPageActions = {
  pledge: async () => {
    await wait();
    return { success: true, pledgeToken: "story-pledge-token-00000000" };
  },
  change: async () => {
    await wait();
    return { success: true };
  },
  withdraw: async () => {
    await wait();
    return { success: true };
  },
  setPaid: async () => {
    await wait();
    return { success: true };
  },
  markBought: async () => {
    await wait();
    return { success: true };
  },
  callOff: async () => {
    await wait();
    return { success: true };
  },
};

const SHARE_URL = "https://regibee.com/group-gift/story-group-gift-token-0000";

// Uncle Oz started it on Dorothy's list. Glinda and the Scarecrow chipped in.
const balloonRide: GroupGiftView = {
  token: "story-group-gift-token-0000",
  status: "open",
  item: {
    title: "Hot air balloon ride for two",
    imageUrl: null,
    url: "https://www.example.com/balloon-ride",
    price: 240,
    onList: true,
  },
  recipientName: "Dorothy",
  listTitle: "Dorothy's 40th",
  listSlug: "dorothy-40th",
  organizerName: "Uncle Oz",
  goalAmount: 240,
  paybackNote: "Venmo @uncle-oz",
  pledged: 145,
  pledges: [
    { id: "p1", name: "Uncle Oz", amount: 80, email: "oz@example.com", paid: false, isMine: true },
    { id: "p2", name: "Glinda Good", amount: 40, email: "glinda@example.com", paid: false, isMine: false },
    { id: "p3", name: "Scarecrow", amount: 25, email: "scarecrow@example.com", paid: true, isMine: false },
  ],
  event: { title: "Dorothy's 40th birthday party", slug: "dorothy-40th-party" },
};

const organizer: GroupGiftViewer = {
  role: "organizer",
  signedIn: true,
  myPledge: { token: "story-pledge-token-oz-0000", name: "Uncle Oz", amount: 80, paid: false },
  prefill: { name: "Uncle Oz", email: "oz@example.com" },
};

// What Glinda sees: names and the total, and only her own amount.
const asGlinda: GroupGiftView = {
  ...balloonRide,
  pledges: balloonRide.pledges.map((p) => ({
    ...p,
    id: null,
    email: null,
    amount: p.name === "Glinda Good" ? p.amount : null,
    paid: p.name === "Glinda Good" ? p.paid : false,
    isMine: p.name === "Glinda Good",
  })),
};

const glinda: GroupGiftViewer = {
  role: "pledger",
  signedIn: false,
  myPledge: { token: "story-pledge-token-glinda-00", name: "Glinda Good", amount: 40, paid: false },
  prefill: null,
};

// Someone opening the link for the first time, without an account.
const asVisitor: GroupGiftView = { ...asGlinda, pledges: asGlinda.pledges.map((p) => ({ ...p, amount: null, isMine: false })) };
const visitor: GroupGiftViewer = { role: "visitor", signedIn: false, myPledge: null, prefill: null };

const meta: Meta<typeof GroupGiftPage> = {
  title: "Pages/GroupGift",
  component: GroupGiftPage,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: { shareUrl: SHARE_URL, actions },
};
export default meta;
type Story = StoryObj<typeof GroupGiftPage>;

/** The organizer: the link to share, everyone's amounts, Paid ticks, and the buttons to finish. */
export const Organizer: Story = {
  args: { view: balloonRide, viewer: organizer },
};

/** Someone who chipped in: the total, who's in, and their own share to change or take back. */
export const Pledger: Story = {
  args: { view: asGlinda, viewer: glinda },
};

/** A first visit without an account, on a phone: name, email and an amount. */
export const NewVisitorOnAPhone: Story = {
  args: { view: asVisitor, viewer: visitor },
  globals: { viewport: { value: "mobile1" } },
};

/** The organizer bought it. People can still chip in and pay back. */
export const Bought: Story = {
  args: { view: { ...asGlinda, status: "bought" }, viewer: glinda },
};

/** The organizer called it off and sees whom they'd marked paid. */
export const CalledOff: Story = {
  args: { view: { ...balloonRide, status: "ended" }, viewer: organizer },
};

/** No goal: just the total so far. Nobody's in yet. */
export const NoGoalYet: Story = {
  args: {
    view: { ...asVisitor, goalAmount: null, pledged: 0, pledges: [], paybackNote: null, event: null },
    viewer: { ...visitor, signedIn: true, prefill: { name: "Tin Man", email: "tin@example.com" } },
  },
};
