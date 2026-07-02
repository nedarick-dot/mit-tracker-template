import { LayoutDashboard, FileText, LogOut, ChevronRight, ShieldAlert, Settings, CalendarClock, Coffee } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DEPARTMENTS, DEPARTMENT_COLORS } from '@/lib/constants';
import { CONFIG } from '@/config';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import type { Department } from '@/lib/constants';

const mainItems = [
  { title: 'Dashboard',       url: '/',         icon: LayoutDashboard },
  { title: 'Monday Brief',    url: '/monday',   icon: Coffee },
  { title: 'Monday Meeting',  url: '/tuesday',  icon: CalendarClock },
  { title: 'Blockers',        url: '/blockers', icon: ShieldAlert },
  { title: 'Weekly Rollups',  url: '/rollups',  icon: FileText },
  { title: 'Setup',           url: '/setup',    icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      {/* Wordmark */}
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        {!collapsed ? (
          <div>
            <p className="text-sidebar-primary text-sm font-semibold tracking-tight leading-none">MIT OS</p>
            <p className="text-sidebar-foreground text-[11px] mt-1 tracking-widest uppercase">{CONFIG.quarter.label}</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-6 h-6 rounded bg-sidebar-accent flex items-center justify-center">
              <span className="text-sidebar-primary text-[10px] font-bold">M</span>
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Main navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {mainItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={item.url}
                        end
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Departments */}
        <SidebarGroup className="mt-6">
          {!collapsed && (
            <p className="px-2.5 mb-2 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/50">
              Departments
            </p>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {DEPARTMENTS.map((dept) => {
                const active = isActive(`/department/${dept}`);
                const color = DEPARTMENT_COLORS[dept as Department];
                return (
                  <SidebarMenuItem key={dept}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink
                        to={`/department/${dept}`}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                        }`}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        {!collapsed && <span>{dept}</span>}
                        {!collapsed && active && (
                          <ChevronRight className="ml-auto h-3 w-3 opacity-60" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground gap-2.5 px-2.5"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
