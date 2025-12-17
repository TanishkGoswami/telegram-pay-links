import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Users, TrendingUp, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalPages: number;
  totalSubscribers: number;
  activeSubscribers: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPages: 0,
    totalSubscribers: 0,
    activeSubscribers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;
      try {
        // Fetch landing pages count
        const { count: pagesCount } = await supabase
          .from("landing_pages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // Fetch landing page IDs for the user
        const { data: pages } = await supabase
          .from("landing_pages")
          .select("id")
          .eq("user_id", user.id);

        const pageIds = pages?.map((p) => p.id) || [];

        let totalSubs = 0;
        let activeSubs = 0;

        if (pageIds.length > 0) {
          // Fetch total subscribers
          const { count: totalCount } = await supabase
            .from("page_subscriptions")
            .select("*", { count: "exact", head: true })
            .in("landing_page_id", pageIds);

          // Fetch active subscribers
          const { count: activeCount } = await supabase
            .from("page_subscriptions")
            .select("*", { count: "exact", head: true })
            .in("landing_page_id", pageIds)
            .eq("status", "active");

          totalSubs = totalCount || 0;
          activeSubs = activeCount || 0;
        }

        setStats({
          totalPages: pagesCount || 0,
          totalSubscribers: totalSubs,
          activeSubscribers: activeSubs,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [user]);

  const statCards = [
    {
      title: "Landing Pages",
      value: stats.totalPages,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Total Subscribers",
      value: stats.totalSubscribers,
      icon: Users,
      color: "text-accent-foreground",
      bgColor: "bg-accent",
    },
    {
      title: "Active Subscribers",
      value: stats.activeSubscribers,
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back! Here's an overview of your subscriptions.
            </p>
          </div>
          <Link to="/dashboard/pages">
            <Button variant="gradient">
              <Plus className="w-4 h-4" />
              Create Page
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              variant="elevated"
              className="animate-fade-in"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {loading ? (
                    <div className="h-9 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card variant="default">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/dashboard/pages">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <FileText className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Manage Pages</div>
                  <div className="text-xs text-muted-foreground">
                    View and edit your landing pages
                  </div>
                </div>
              </Button>
            </Link>
            <Link to="/dashboard/integrations">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <TrendingUp className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Setup Payments</div>
                  <div className="text-xs text-muted-foreground">
                    Configure payment providers
                  </div>
                </div>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
