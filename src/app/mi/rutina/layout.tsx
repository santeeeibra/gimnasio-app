import { TimerDescanso } from "@/components/rutinas/timer-descanso";

export default function RutinaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <TimerDescanso />
    </>
  );
}
