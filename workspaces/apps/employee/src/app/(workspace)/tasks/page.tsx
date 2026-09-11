import type { Metadata } from "next";
import { requireAccount } from "@muco/core/server";
import { Icon } from "@muco/ui";
import { TaskList, type TaskRow } from "@muco/ui/work";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { supabase, userId } = await requireAccount("employee");

  const { data } = await supabase
    .from("tasks")
    .select("id,title,description,status,priority,due_at,projects(name)")
    .eq("assignee_id", userId)
    .neq("status", "cancelled")
    .order("status", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .limit(200);

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
        <span className="eyebrow">Assigned to you</span>
        <h1>Tasks</h1>
        <p className="lede">
          Every task assigned to you, across every project you are on. Marking one done is the only
          change you can make from here — reassigning or moving a task is refused by the database,
          not merely absent from this page.
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
          Tasks on projects you have not been granted do not appear here, and are not returned to
          this account at all.
        </span>
      </p>
    </div>
  );
}
