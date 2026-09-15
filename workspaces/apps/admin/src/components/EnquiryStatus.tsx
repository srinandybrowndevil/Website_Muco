import { RecordStatus } from "./RecordStatus";

export function EnquiryStatus({ id, status }: { id: string; status: string }) {
  return <RecordStatus id={id} status={status} table="website_enquiries" choices={[["new", "New"], ["contacted", "Contacted"], ["qualified", "Qualified"], ["closed", "Closed"], ["spam", "Spam"]]} />;
}
