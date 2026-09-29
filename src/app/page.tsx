import { redirect } from "next/navigation";
import { getSessionDestination } from "@/lib/auth";
import LandingPage from "./landing-page";

export default async function Home() {
  const destination = await getSessionDestination();
  if (!destination) return <LandingPage />;
  redirect(destination);
}
