import { useState, useEffect } from 'react';
import { Plus, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreatePageDialog } from '@/components/CreatePageDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { LandingPageWithSubscribers } from '@/types/database';

export default function Pages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPageWithSubscribers[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchPages = async () => {
    if (!user) return;

    try {
      const { data: pagesData, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch subscriber counts for each page
      const pagesWithCounts = await Promise.all(
        (pagesData || []).map(async (page) => {
          const { count } = await supabase
            .from('page_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('landing_page_id', page.id);

          return {
            ...page,
            subscribers_count: count || 0,
          } as LandingPageWithSubscribers;
        })
      );

      setPages(pagesWithCounts);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast({
        title: "Error",
        description: "Failed to load pages. Please refresh.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, [user]);

  const handleToggleActive = async (pageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ is_active: !currentStatus })
        .eq('id', pageId);

      if (error) throw error;

      setPages(pages.map(p => 
        p.id === pageId ? { ...p, is_active: !currentStatus } : p
      ));

      toast({
        title: currentStatus ? "Page deactivated" : "Page activated",
        description: currentStatus 
          ? "The page is now hidden from public view." 
          : "The page is now live and accepting subscribers.",
      });
    } catch (error) {
      console.error('Error toggling page status:', error);
      toast({
        title: "Error",
        description: "Failed to update page status.",
        variant: "destructive",
      });
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied!",
      description: "The page link has been copied to your clipboard.",
    });
  };

  const openPage = (slug: string) => {
    window.open(`/p/${slug}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
            <p className="text-muted-foreground">
              Create and manage your subscription pages.
            </p>
          </div>
          <Button variant="gradient" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Create Page
          </Button>
        </div>

        {/* Pages Table */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-lg">Your Pages</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : pages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No pages yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first landing page to start accepting subscribers.
                </p>
                <Button variant="gradient" onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Page
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead className="text-center">Subscribers</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            /p/{page.slug}
                          </code>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">
                            {page.subscribers_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={page.is_active}
                            onCheckedChange={() => handleToggleActive(page.id, page.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyLink(page.slug)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openPage(page.slug)}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreatePageDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchPages}
      />
    </DashboardLayout>
  );
}
