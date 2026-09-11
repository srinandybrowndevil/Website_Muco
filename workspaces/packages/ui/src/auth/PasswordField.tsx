"use client";

import { useEffect, useId, useState } from "react";
import { passwordRequirements, REQUIREMENT_LABELS } from "@muco/core";
import { breachMessage, checkPasswordBreached } from "@muco/core/breach";
import { Icon } from "../Icon";
import { Requirements } from "../primitives";

/**
 * A password field that tells the truth while it is being typed.
 *
 * Two checks, in this order. The local rules run on every keystroke and are
 * the ones that always apply. The breach lookup runs after typing stops, sends
 * five characters of a hash rather than the password, and can come back
 * "unavailable" — which is not the same as safe, and is reported as neither.
 *
 * Why it matters here and not only on the server: "Mucolabs@2026" satisfies
 * every character rule anybody would write, and is the first thing somebody
 * attacking these four addresses would try.
 */
export function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  onVerdict,
  autoComplete = "new-password",
  showRules = true,
}: {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onVerdict?: (breached: boolean) => void;
  autoComplete?: string;
  showRules?: boolean;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);
  const [breach, setBreach] = useState<string | null>(null);

  const rules = passwordRequirements(value);
  const allMet = Object.values(rules).every(Boolean);

  useEffect(() => {
    if (!showRules || !allMet) {
      setBreach(null);
      onVerdict?.(false);
      return;
    }
    const controller = new AbortController();
    // Waiting for a pause means one lookup per password rather than one per
    // character, and the corpus service belongs to somebody else.
    const timer = setTimeout(async () => {
      const verdict = await checkPasswordBreached(value, controller.signal);
      const message = breachMessage(verdict);
      setBreach(message);
      onVerdict?.(verdict === "breached");
    }, 450);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // onVerdict is excluded on purpose: callers pass an inline function, and
    // including it re-runs the lookup on every render of the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, allMet, showRules]);

  return (
    <div className="field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="passwrap">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          onChange={event => onChange(event.target.value)}
          aria-describedby={breach ? fieldId + "-breach" : undefined}
          aria-invalid={breach ? true : undefined}
          required
        />
        <button
          type="button"
          className="iconbtn"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={16} />
        </button>
      </div>
      {showRules ? (
        <Requirements items={REQUIREMENT_LABELS.map(([key, text]) => [text, rules[key]])} />
      ) : null}
      {breach ? (
        <p className="errortext" id={fieldId + "-breach"} role="alert">{breach}</p>
      ) : null}
    </div>
  );
}
