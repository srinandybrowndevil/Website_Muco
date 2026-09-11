import { requireStaff } from "@/lib/staff";
import { createClient } from "@/lib/supabase/server";
import { StaffShell } from "@/components/staff/StaffShell";
import { TaskList } from "@/components/work/TaskList";

// Specification 11.4 item 4. The same rule as the intern list: assigned only,
// and the one change you may make is marking it done.

export const metadata = { title: "Your tasks" };

export default async function StaffTasksPage() {
  await requireStaff();
  const client = await createClient();
  if (!client) throw new Error("Configure Supabase before opening your tasks.");

  const { data, error } = await client.from("tasks")
    .select("id, title, description, priority, status, due_at, project:projects(name)")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

  return (
    <StaffShell>
      <div className="pagehead">
        <div>
          <p className="eyebrow">Staff</p>
          <h1>Your tasks.</h1>
          <p>Assigned to you across every project you are on.</p>
        </div>
      </div>

      {error && <p className="error" role="alert">Your tasks could not be loaded. Refresh to try again.</p>}

      <TaskList
        tasks={(data ?? []) as never}
        emptyBody="A task appears here when somebody assigns it to you on a project you are granted. Nothing is hidden from this list that you have been given."
      />
    </StaffShell>
  );
}
