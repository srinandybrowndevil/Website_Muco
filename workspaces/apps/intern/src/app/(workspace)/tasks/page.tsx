import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { Icon } from "@muco/ui";
import { TaskList, type TaskRow } from "@/components/TaskList";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { supabase, userId } = await requireAccount("intern");

  // assignee_id is the whole filter, and it is also what the policy enforces.
  // An intern querying this table directly gets exactly these rows back; the
  // filter here is for ordering, not for safety.
  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,due_at,projects(name)")
    .eq("assignee_id", userId)
    .neq("status", "cancelled")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(100);

  const tasks: TaskRow[] = (data ?? []).map(row => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      due_at: row.due_at,
      project: (project as { name?: string } | null)?.name ?? null,
    };
  });

  const open = tasks.filter(task => task.status !== "completed").length;

  return (
    <div className="page">
      <div className="page-head">
        <span className="eyebrow">Assigned work</span>
        <h1>Tasks</h1>
        <p className="lede">
          You can see only the tasks assigned to you. Tick one when it is done; that is the only
          change you can make here, and it is enforced by the database rather than by this page.
        </p>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{open === 0 ? "All caught up" : open + " open"}</h2>
          <span className="hint">{tasks.length} in total</span>
        </div>
        <TaskList tasks={tasks} />
      </section>

      <p className="notice">
        <Icon name="info" size={14} />
        <span>
          A task you cannot see is not a task you missed. Work reaches you through your mentor, who
          assigns it here.
        </span>
      </p>
    </div>
  );
}
