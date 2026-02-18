
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Receipt, PieChart, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h3 className="tracking-tight text-sm font-medium">Total Projects</h3>
            <div className="text-2xl font-bold">12</div>
          </div>
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h3 className="tracking-tight text-sm font-medium">Active Milestones</h3>
            <div className="text-2xl font-bold">5</div>
          </div>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h3 className="tracking-tight text-sm font-medium">Pending Invoices</h3>
            <div className="text-2xl font-bold">3</div>
          </div>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <h3 className="tracking-tight text-sm font-medium">Clients</h3>
            <div className="text-2xl font-bold">8</div>
          </div>
          <Users className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0">
            <h3 className="font-semibold leading-none tracking-tight">Recent Projects</h3>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">No recent projects.</p>
          </div>
        </div>
        <div className="col-span-3 rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-6 flex flex-row items-center justify-between space-y-0">
            <h3 className="font-semibold leading-none tracking-tight">Recent Activity</h3>
          </div>
          <div className="p-6 pt-0">
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
