import { requireStaffODueno } from "@/lib/auth";
import { CheckinForm } from "./checkin-form";

export const metadata = { title: "Check-in" };

export default async function CheckinPage() {
  await requireStaffODueno();
  return <CheckinForm />;
}
