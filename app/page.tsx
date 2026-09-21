import LockControl from "@/components/layout/LockControl";
import { isDemoMode } from "@/lib/config";

export default function Home() {
  const demo = isDemoMode();

  return (
    <main
      className="relative h-dvh w-full bg-[#0a0a0f]"
      aria-label="Family Wall Dashboard"
    >
      {demo ? null : <LockControl />}
    </main>
  );
}
