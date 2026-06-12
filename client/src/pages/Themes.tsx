import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Download, Settings } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Theme } from "@shared/schema-types";

export default function Themes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: themes, isLoading } = useQuery({
    queryKey: ['/api/themes'],
  });

  const { data: activeTheme } = useQuery({
    queryKey: ['/api/themes/active'],
  });

  const activateMutation = useMutation({
    mutationFn: async (themeId: number) => {
      return await apiRequest('POST', `/api/themes/${themeId}/activate`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Theme activated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/themes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/themes/active'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate theme",
        variant: "destructive",
      });
    },
  });

  const handleActivate = (themeId: number) => {
    activateMutation.mutate(themeId);
  };

  const getRendererBadge = (renderer: string | undefined | null) => {
  const colors: Record<string, string> = {
    nextjs: "bg-black text-white",
    react: "bg-blue-500 text-white",
    custom: "bg-purple-500 text-white"
  };
  const label = typeof renderer === "string" && renderer.length > 0
    ? renderer.toUpperCase()
    : "UNKNOWN";
  return (
    <Badge className={colors[renderer as string] || "bg-gray-500 text-white"}>
      {label}
    </Badge>
  );
};

  return (
    <AdminLayout
      title="Themes"
      actions={
        <Button className="bg-npb-accent hover:bg-npb-accent-hover text-white">
          <Download className="w-4 h-4 mr-2" />
          Install Theme
        </Button>
      }
    >
          {/* Current Theme */}
          {(activeTheme && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-wp-gray mb-4">Current Theme</h2>
              <Card className="border-2 border-wp-blue">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-6">
                    <img 
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                      alt={(activeTheme as any).name}
                      className="w-48 h-32 object-cover rounded border"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                         <h3 className="text-xl font-semibold text-wp-gray">{(activeTheme as any).name}</h3>
                         {getRendererBadge((activeTheme as any).renderer)}
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      </div>
                       <p className="text-gray-600 mb-4">{(activeTheme as any).description}</p>
                       <div className="flex items-center justify-between">
                         <div className="text-sm text-gray-500">
                           <div>Version: {(activeTheme as any).version}</div>
                           <div>By: {(activeTheme as any).author}</div>
                        </div>
                        <div className="flex space-x-3">
                          <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Customize
                          </Button>
                          <Button className="bg-wp-blue hover:bg-wp-blue-dark text-white">
                            Live Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )) as React.ReactNode}

          {/* Available Themes */}
          <div>
            <h2 className="text-lg font-semibold text-wp-gray mb-4">Available Themes</h2>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading themes...</div>
            ) : (themes as any)?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No themes available. Install a theme to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(themes as any)?.filter((theme: Theme) => activeTheme?.id !== theme.id).map((theme: Theme) => (
                  <Card key={theme.id} className="border border-gray-200 hover:border-wp-blue transition-colors">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <img 
                          src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250" 
                          alt={theme.name}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-wp-gray">{theme.name}</h3>
                            {theme.renderer && getRendererBadge(theme.renderer)}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{theme.description}</p>
                          <div className="text-xs text-gray-500 mb-4">
                            <div>Version: {theme.version}</div>
                            <div>By: {theme.authorId}</div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            className="flex-1 bg-wp-blue hover:bg-wp-blue-dark text-white"
                            onClick={() => handleActivate(theme.id as unknown as number)}
                            disabled={activateMutation.isPending}
                          >
                            Activate
                          </Button>
                          <Button variant="outline" className="flex-1">
                            Preview
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Theme Development Info */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-wp-gray mb-4">Theme Development</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-wp-gray mb-2">Supported Renderers</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-black text-white">NEXTJS</Badge>
                    <span className="text-sm text-gray-600">Next.js with server-side rendering</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-500 text-white">REACT</Badge>
                    <span className="text-sm text-gray-600">React with client-side rendering</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-purple-500 text-white">CUSTOM</Badge>
                    <span className="text-sm text-gray-600">Custom rendering engine</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-wp-gray mb-2">Theme Features</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• WordPress-compatible template hierarchy</li>
                  <li>• Hook system integration</li>
                  <li>• Custom configuration options</li>
                  <li>• Hot reloading in development</li>
                  <li>• SEO optimization built-in</li>
                </ul>
              </div>
            </div>
          </div>
    </AdminLayout>
  );
}
