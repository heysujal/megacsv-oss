// "Feedback": what it is about, the user's message, a reply address (required), and a
// few details shown before sending. Never the file, its name or contents. Screenshots
// can't be attached; the dialog points people to hi@megacsv.com for those.
import { useEffect, useRef, useState } from "react";
import { track } from "../../analytics";
import { closeDialog, openFileSize } from "../../app/controller";
import { useApp } from "../../app/store";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { Input, Textarea } from "../ui/field";

interface FeedbackDetails {
  appVersion: string;
  browser: string;
  os: string;
  fileSize: string;
}

const KINDS = [
  ["problem", "Something's wrong"],
  ["idea", "An idea"],
  ["other", "Something else"],
] as const;

/** Sending the message; `note` is what the status line says when there's something to say. */
type Send = { phase: "writing"; note: string } | { phase: "sending" } | { phase: "sent" } | { phase: "failed"; note: string };

const WRITING: Send = { phase: "writing", note: "" };
const SEND_NOTES: Record<"sending" | "sent", string> = { sending: "Sending…", sent: "Thanks! Your feedback was sent." };

export function FeedbackDialog() {
  const open = useApp((s) => s.dialog?.kind === "feedback");
  const [kind, setKind] = useState<string>("problem");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [send, setSend] = useState<Send>(WRITING);
  /** Which attempt is current: an answer to an earlier opening of the dialog changes nothing. */
  const attempt = useRef(0);
  const [details, setDetails] = useState<FeedbackDetails | null>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setDetails(collectDetails(openFileSize()));
    attempt.current++;
    setSend(WRITING);
    requestAnimationFrame(() => msgRef.current?.focus());
  }, [open]);

  // "Thanks!" stays for a moment, and only while this dialog is the one open.
  useEffect(() => {
    if (!open || send.phase !== "sent") return;
    const t = setTimeout(closeDialog, 1500);
    return () => clearTimeout(t);
  }, [open, send.phase]);

  const submit = async () => {
    const text = message.trim();
    if (!text) {
      setSend({ phase: "writing", note: "Please write a message." });
      return;
    }
    if (!email.trim()) {
      setSend({ phase: "writing", note: "Please enter your email so we can reply." });
      return;
    }
    const mine = ++attempt.current;
    setSend({ phase: "sending" });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: text, email: email.trim(), ...details }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `The server answered ${res.status}.`);
      track("feedback_sent", { kind, length: text.length });
      if (mine !== attempt.current) return;
      setSend({ phase: "sent" });
      setMessage("");
    } catch (err) {
      const offline = err instanceof TypeError;
      track("feedback_failed", { offline });
      if (mine !== attempt.current) return;
      setSend({
        phase: "failed",
        note: offline
          ? "Couldn't send: you seem to be offline. Your message is still here; try again when you're connected."
          : `Couldn't send: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  };

  return (
    <Dialog
      id="feedback-dialog"
      open={open}
      onClose={closeDialog}
      state={send.phase}
      title="Send feedback"
      footer={
        <>
          <span className="flex-1" />
          <Button id="feedback-cancel" onClick={closeDialog}>
            Cancel
          </Button>
          <Button id="feedback-send" type="submit" form="feedback-form" variant="primary" disabled={send.phase === "sending" || send.phase === "sent"}>
            Send
          </Button>
        </>
      }
    >
      <form
        id="feedback-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset className="flex flex-wrap gap-1.5">
          <legend className="mb-2 text-[14px] font-medium">What is it about?</legend>
          {KINDS.map(([value, label]) => (
            <label
              key={value}
              className="cursor-pointer rounded-control bg-tone-1 px-3 py-2 text-[14px] transition-colors select-none hover:bg-tone-2 has-[:checked]:bg-cobalt has-[:checked]:text-on-cobalt has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-cobalt"
            >
              <input type="radio" name="kind" value={value} checked={kind === value} onChange={() => setKind(value)} className="sr-only" />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">
          Your message
          <Textarea
            id="feedback-message"
            ref={msgRef}
            rows={5}
            maxLength={5000}
            required
            placeholder="If something went wrong, tell us what you were doing."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="font-normal"
          />
        </label>
        <p id="feedback-screenshots" className="-mt-2 text-[13px] text-muted">
          Have screenshots? Email them to{" "}
          <a href="mailto:hi@megacsv.com?subject=MegaCSV%20feedback" className="text-cobalt underline-offset-4 hover:underline">
            hi@megacsv.com
          </a>
          .
        </p>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium">
          <span>
            Your email <span className="font-normal text-muted">(so we can reply)</span>
          </span>
          <Input
            id="feedback-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-normal"
          />
        </label>
        <p id="feedback-details" className="text-[13px] text-muted">
          {details &&
            `We'll also send: MegaCSV ${details.appVersion}, ${details.browser} on ${details.os}, file size ${details.fileSize}. Never your file, its name, or anything in it.`}
        </p>
        <p id="feedback-status" className="min-h-5 text-[14px]" role="status">
          {send.phase === "sending" || send.phase === "sent" ? SEND_NOTES[send.phase] : send.note}
        </p>
      </form>
    </Dialog>
  );
}

function collectDetails(size: number | null): FeedbackDetails {
  const ua = navigator.userAgent;
  const browser =
    match(ua, /Edg\/(\d+)/, "Edge") ??
    match(ua, /OPR\/(\d+)/, "Opera") ??
    match(ua, /Firefox\/(\d+)/, "Firefox") ??
    match(ua, /Chrome\/(\d+)/, "Chrome") ??
    match(ua, /Version\/(\d+).*Safari/, "Safari") ??
    "another browser";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Mac OS X|Macintosh/.test(ua)
      ? "macOS"
      : /Windows/.test(ua)
        ? "Windows"
        : /Android/.test(ua)
          ? "Android"
          : /Linux/.test(ua)
            ? "Linux"
            : "another system";
  return { appVersion: __APP_VERSION__, browser, os, fileSize: sizeRange(size) };
}

function match(ua: string, rx: RegExp, name: string): string | null {
  const m = ua.match(rx);
  return m ? `${name} ${m[1]}` : null;
}

/** A coarse range, so feedback says nothing identifying about the file. */
function sizeRange(bytes: number | null): string {
  if (bytes === null) return "no file open";
  const ranges: [number, string][] = [
    [1e6, "under 1 MB"],
    [100e6, "1–100 MB"],
    [1e9, "100 MB–1 GB"],
    [5e9, "1–5 GB"],
    [20e9, "5–20 GB"],
    [100e9, "20–100 GB"],
  ];
  return ranges.find(([max]) => bytes < max)?.[1] ?? "over 100 GB";
}
