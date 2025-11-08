import { Home, BarChart3, ListTodo } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { useState, useEffect } from "react";
import { getUserDailyQuests, claimDailyQuest } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

const menuItems = [
  { title: "首頁", url: "/", icon: Home },
  { title: "Status", url: "/status", icon: BarChart3 },
];

// Hard-coded 每日任務
const DAILY_QUESTS = [
  {
    id: 1,
    title: "每日登錄",
    description: "登錄遊戲即可完成",
    reward: "💪+5 ⚡+5 😊+5",
  },
  {
    id: 2,
    title: "運動達人",
    description: "累計運動 10 分鐘",
    reward: "💪+10 😊+5",
  },
  {
    id: 3,
    title: "步行挑戰",
    description: "累計步行 5000 步",
    reward: "💪+10 😊+5",
  },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { userId, refreshPet } = useUser();
  const [completedQuests, setCompletedQuests] = useState<Set<number>>(new Set());
  const [claiming, setClaiming] = useState<number | null>(null);
  const [missionsOpen, setMissionsOpen] = useState(false);

  useEffect(() => {
    const loadQuests = async () => {
      if (!userId) return;

      try {
        const data = await getUserDailyQuests(userId);
        const completed = new Set(
          data.quests.filter(q => q.completed).map(q => q.id)
        );
        setCompletedQuests(completed);
      } catch (error) {
        console.error("Failed to load daily quests:", error);
      }
    };

    loadQuests();
  }, [userId]);

  const handleClaimReward = async (questId: number) => {
    if (claiming !== null || completedQuests.has(questId)) return; // 防止重複領取

    setClaiming(questId);
    try {
      const result = await claimDailyQuest(userId, questId);
      if (result.success) {
        const rewards = result.rewards;
        toast.success(`任務完成！💪 +${rewards?.strength || 0}, ⚡ +${rewards?.stamina || 0}, 😊 +${rewards?.mood || 0}`);

        // 重新載入任務狀態
        const data = await getUserDailyQuests(userId);
        const completed = new Set(
          data.quests.filter(q => q.completed).map(q => q.id)
        );
        setCompletedQuests(completed);

        await refreshPet();
      } else {
        toast.error(result.message || "領取獎勵失敗");
      }
    } catch (error) {
      console.error("Failed to claim reward:", error);
      const errorMessage = error instanceof Error ? error.message : "領取獎勵失敗";
      toast.error(errorMessage);
    } finally {
      setClaiming(null);
    }
  };

  return (
    <Sidebar
      className="border-r"
      style={{ borderColor: 'var(--tp-grayscale-200)', ["--sidebar-width" as any]: "100vw" } as any}
    >
      <SidebarContent className="relative" style={{ backgroundColor: '#EDF8FA' }}>
        <SidebarGroup>
          <SidebarGroupLabel className="tp-h3-semibold" style={{ color: 'var(--tp-grayscale-700)' }}>
            選單
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="tp-body-regular hover:bg-opacity-50"
                      style={{ color: 'var(--tp-grayscale-700)' }}
                      activeClassName="font-semibold"
                      activeStyle={{
                        backgroundColor: 'var(--tp-primary-100)',
                        color: 'var(--tp-primary-700)'
                      }}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <Collapsible open={missionsOpen} onOpenChange={setMissionsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="tp-h3-semibold flex items-center justify-between w-full hover:bg-opacity-50" style={{ color: 'var(--tp-grayscale-700)' }}>
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  {open && <span>每日任務</span>}
                </div>
                {open && <ChevronDown className={`w-4 h-4 transition-transform ${missionsOpen ? 'rotate-180' : ''}`} />}
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <div className="space-y-2 px-2">
                  {DAILY_QUESTS.map((quest) => {
                    const isCompleted = completedQuests.has(quest.id);
                    return (
                      <div
                        key={quest.id}
                        className="flex items-center gap-2 p-2 rounded"
                        style={{ backgroundColor: isCompleted ? 'var(--tp-primary-50)' : 'transparent' }}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--tp-primary-500)' }} />
                        ) : (
                          <Circle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--tp-grayscale-300)' }} />
                        )}
                        {open && (
                          <div className="flex-1">
                            <div className="tp-body-regular" style={{
                              color: isCompleted ? 'var(--tp-grayscale-500)' : 'var(--tp-grayscale-700)',
                              textDecoration: isCompleted ? 'line-through' : 'none'
                            }}>
                              {quest.title}
                            </div>
                            <div className="tp-caption" style={{ color: 'var(--tp-secondary-600)' }}>
                              {quest.reward}
                            </div>
                          </div>
                        )}
                        {open && !isCompleted && (
                          <button
                            onClick={() => handleClaimReward(quest.id)}
                            disabled={claiming === quest.id}
                            className="px-2 py-1 text-xs rounded"
                            style={{
                              backgroundColor: claiming === quest.id ? 'var(--tp-grayscale-200)' : 'var(--tp-primary-500)',
                              color: 'var(--tp-white)',
                              cursor: claiming === quest.id ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {claiming === quest.id ? '...' : '領取'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

      </SidebarContent>
    </Sidebar>
  );
}
