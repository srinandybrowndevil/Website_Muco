import { RecordStatus } from "./RecordStatus";

export function RequestStatus({ id, status }: { id: string; status: string }) {
  return <RecordStatus id={id} status={status} table="project_requests" choices={[["new", "New"], ["reviewing", "Reviewing"], ["needs_info", "Needs information"], ["accepted", "Accepted"], ["declined", "Declined"]]} />;
}
