import Dashboard from "@/components/Dashboard";
import { getComebackData } from "@/lib/mlb";

export const revalidate = 1800;

export default async function Home() {
  const data = await getComebackData();
  return (
    <main className="flex flex-1 flex-col">
      <Dashboard initialData={data} />
    </main>
  );
}
