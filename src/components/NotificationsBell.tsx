import { useEffect, useState } from "react";
import { Bell, BellRing, Check, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  due_date: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unread = items.filter((n) => !n.read_at).length;

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (!error && data) setItems(data as Notification[]);
  };

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    load();
    const channel = supabase
      .channel("notifications-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null)
      .eq("user_id", user.id);
    toast.success("تم تعليم جميع الإشعارات كمقروءة");
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    toast.success("تم مسح جميع الإشعارات");
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative gap-1.5">
          {unread > 0 ? (
            <BellRing className="h-4 w-4 text-primary" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {unread > 0 && (
            <Badge
              variant="default"
              className="absolute -top-2 -start-2 h-5 min-w-5 px-1 text-[10px] rounded-full"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0" dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" /> الإشعارات
            {unread > 0 && (
              <Badge variant="secondary" className="h-5">
                {unread} جديدة
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={markAllRead}>
                <CheckCheck className="h-3.5 w-3.5 me-1" /> تعليم الكل
              </Button>
            )}
            {items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive"
                onClick={clearAll}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              لا توجد إشعارات حالياً
              <p className="text-xs mt-1">سنذكّرك تلقائياً قبل اكتمال الحول.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 text-sm hover:bg-accent/40 transition-colors ${
                    !n.read_at ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {!n.read_at && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        {n.title}
                      </div>
                      {n.body && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {n.body}
                        </p>
                      )}
                      <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                        <span>{new Date(n.created_at).toLocaleString("ar-EG")}</span>
                        {n.link && (
                          <a
                            href={n.link}
                            onClick={() => {
                              markRead(n.id);
                              setOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> فتح
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.read_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markRead(n.id)}
                          title="تعليم كمقروء"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => remove(n.id)}
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
