"use client";

import Link from "next/link";
import { Icon } from "./Icon";

// The video's second point: an empty dashboard with a single button is better
// than a blank one, but a new account still does not know what the whole
// sequence looks like. This shows the three steps that get a customer from
// signed up to work in progress, and which one they are on.
//
// Deliberately not a blocking tour. It is a checklist that sits on the page,
// marks off what is already done, and links to the one step that is next --
// so someone who knows what they are doing can ignore it entirely and just
// use the button.

export type Step = {
  title: string;
  body: string;
  done: boolean;
  href?: string;
  cta?: string;
};

export function GettingStarted({ steps }: { steps: Step[] }) {
  const doneCount = steps.filter(step => step.done).length;
  const next = steps.findIndex(step => !step.done);
  const complete = next === -1;

  return (
    <section className={`gettingstarted${complete ? " complete" : ""}`} aria-label="Getting started">
      <header>
        <div>
          <h3>{complete ? "You are all set." : "Getting started"}</h3>
          <p>{complete
            ? "Everything below is done. Your workspace fills in as the work moves."
            : "Three steps from here to work in progress."}</p>
        </div>
        <span className="gettingstarted-count" aria-hidden="true">{doneCount}/{steps.length}</span>
      </header>

      <ol className="gettingstarted-steps">
        {steps.map((step, index) => {
          const isNext = index === next;
          return (
            <li key={step.title} className={step.done ? "done" : isNext ? "next" : ""}>
              <span className="gettingstarted-marker" aria-hidden="true">
                {step.done ? <Icon name="check" size={13} /> : index + 1}
              </span>
              <div>
                <b>{step.title}</b>
                <small>{step.body}</small>
                {isNext && step.href && step.cta && (
                  <Link className="primary compact gettingstarted-cta" href={step.href}>{step.cta}</Link>
                )}
              </div>
              <span className="visually-hidden">{step.done ? "Done" : isNext ? "Next step" : "Not started"}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
