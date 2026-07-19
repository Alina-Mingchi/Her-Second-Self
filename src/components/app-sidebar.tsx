import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Home,
  Mic,
  Utensils,
  Activity,
  History,
  Users,
  FileDown,
  ShieldCheck,
  Brain,
  Settings,
  LogOut,
  Beaker,
  ClipboardList,
  FileText,
  Database,
  Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/me";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Item = { title: string; url: string; icon: any };

const participant: Item[] = [
  { title: "Today", url: "/today", icon: Home },
  { title: "Log symptoms", url: "/log/symptoms", icon: ClipboardList },
  { title: "Voice memo", url: "/log/voice", icon: Mic },
  { title: "Food photo", url: "/log/food", icon: Utensils },
  { title: "Wearable data", url: "/log/wearable", icon: Activity },
  { title: "History", url: "/history", icon: History },
];

const researcher: Item[] = [
  { title: "Participants", url: "/participants", icon: Users },
  { title: "External datasets", url: "/datasets", icon: Database },
  { title: "Export", url: "/export", icon: FileDown },
  { title: "Brain signals", url: "/log/brain", icon: Brain },
  { title: "Lab results", url: "/log/labs", icon: Beaker },
];

const clinician: Item[] = [
  { title: "Participants", url: "/participants", icon: Users },
  { title: "EHR upload", url: "/log/ehr", icon: FileText },
  { title: "Lab results", url: "/log/labs", icon: Beaker },
];

const admin: Item[] = [
  { title: "Studies", url: "/admin/studies", icon: ShieldCheck },
  { title: "Dataset requests", url: "/admin/dataset-requests", icon: Inbox },
  { title: "Consent templates", url: "/admin/consents", icon: ClipboardList },
  { title: "Audit log", url: "/admin/audit", icon: History },
];

export function AppSidebar({ roles }: { roles: AppRole[] }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isActive = (u: string) => path === u || path.startsWith(u + "/");

  const hasRole = (r: AppRole) => roles.includes(r);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/today" className="flex items-center gap-2 px-2 py-1">
          <span className="h-7 w-7 rounded-full bg-primary" />
          <span className="font-display text-base font-semibold">Her Second Self</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Participant</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {participant.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(hasRole("researcher") || hasRole("admin")) && (
          <SidebarGroup>
            <SidebarGroupLabel>Research</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {researcher.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole("clinician") && (
          <SidebarGroup>
            <SidebarGroupLabel>Clinician</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {clinician.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {hasRole("admin") && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/settings")}>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings & privacy</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
