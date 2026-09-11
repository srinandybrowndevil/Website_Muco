import { requireIntern } from "@/lib/intern";
import { createClient } from "@/lib/supabase/server";
import { InternShell } from "@/components/intern/InternShell";
import { TaskList } from "@/components/work/TaskList";

// Specification 11.3 item 3. Assigned tickets, and nothing else.
//
// No filter on assignee here. The policy restricts these rows to the tasks
// assigned to the signed-in person, and filtering again in the page would
// hide a policy regression rather than let a test catch it.

export const metadata = { title: "Your tasks" };

export default async function InternTasksPage() {
  const { readOnly } = await requireIntern();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your tasks.");

  const { data, error } = await client.from("tasks")
    .select("id, title, description, priority, status, due_at, project:projects(name)")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(100);

  return (
    <InternShell readOnly={readOnly}>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Internship</p>
          <h1>Your tasks.</h1>
          <p>Only what has been assigned to you. Your mentor decides what appears here.</p>
        </div>
      </div>

      {error && <p className="error" role="alert">Your tasks could not be loaded. Refresh to try again.</p>}

      <TaskList
        tasks={(data ?? []) as never}
        emptyBody="Your mentor assigns work here. Until then there is nothing you need to do, and an empty list is not a problem with the page."
      />
    </InternShell>
  );
}
