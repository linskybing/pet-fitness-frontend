import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pet from "@/components/Pet";
import StatBar from "@/components/StatBar";
import ActionButton from "@/components/ActionButton";
import { Dumbbell, Map } from "lucide-react";
import EditIconSvg from "@/assets/svg/edit.svg";
import StrengthIconSvg from "@/assets/svg/strength.svg";
import HeartIconSvg from "@/assets/svg/heart.svg";
import SmileIconSvg from "@/assets/svg/smile.svg";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import TPButton from "@/components/TPButton/TPButton";
import { useUser } from "@/hooks/useUser";
import { updateUserPet, performDailyCheck, getStageName as getAPIStageNameFunc } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const { userId, pet, refreshPet, isLoading } = useUser();
  const { toast } = useToast();
  const [editingName, setEditingName] = useState("");
  const [namePopoverOpen, setNamePopoverOpen] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [hasCheckedDaily, setHasCheckedDaily] = useState(false);

  // Perform daily check when component mounts
  useEffect(() => {
    const checkDaily = async () => {
      if (userId && !hasCheckedDaily && pet) {
        // Check if daily check was already done today
        const today = new Date().toISOString().split('T')[0];
        const lastCheckDate = pet.last_daily_check ? new Date(pet.last_daily_check).toISOString().split('T')[0] : null;

        if (lastCheckDate === today) {
          setHasCheckedDaily(true);
          return;
        }

        try {
          const result = await performDailyCheck(userId);
          // Only show toast if exercise was insufficient
          if (!result.exercised_enough) {
            toast({
              title: "昨天運動量不足！",
              description: result.message,
              variant: "destructive",
            });
          }
          await refreshPet();
          setHasCheckedDaily(true);
        } catch (error) {
          console.error("Daily check failed:", error);
        }
      }
    };
    checkDaily();
  }, [userId, hasCheckedDaily, pet, refreshPet, toast]);

  // 入場動畫
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEntrance(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const getStageName = (stage: number) => {
    const stageNames: Record<number, string> = {
      0: "蛋",
      1: "小雞",
      2: "中雞",
      3: "大雞",
      4: "大胸雞",
    };
    return stageNames[stage] || "小雞";
  };

  const getChickenMessage = () => {
    if (!pet) return "咕咕！準備好一起運動了嗎？";

    const { strength, stamina, mood, level } = pet;
    const currentLevelStrength = strength % 120;

    if (stamina <= 0) {
      return "咕咕！今天運動量已經足夠了，休息也很重要喔！🌟";
    }

    if (mood > 80) {
      return "咕咕！心情超好！繼續保持運動習慣喔！💪";
    }

    if (mood > 60) {
      return "咕咕～感覺還不錯呢！";
    }

    if (currentLevelStrength < 60) {
      return "咕咕...今天還沒達標呢，記得要運動至少10分鐘喔！";
    }

    if (mood <= 40) {
      return "咕...好久沒運動了，我快要生鏽了...";
    }

    return "咕咕！準備好一起運動了嗎？";
  };

  const handleNameEdit = async () => {
    if (editingName.trim() && userId) {
      try {
        await updateUserPet(userId, { name: editingName.trim() });
        await refreshPet();
        setNamePopoverOpen(false);
        setEditingName("");
        toast({
          title: "成功",
          description: "名稱已更新！",
        });
      } catch (error) {
        toast({
          title: "錯誤",
          description: "更新名稱失敗",
          variant: "destructive",
        });
        console.error(error);
      }
    }
  };

  // Show loading state
  if (isLoading && !pet) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full items-center justify-center" style={{ backgroundColor: 'var(--tp-primary-50)' }}>
          <div className="tp-h2-semibold" style={{ color: 'var(--tp-primary-700)' }}>載入中...</div>
        </div>
      </SidebarProvider>
    );
  }

  // Redirect to login if no user
  if (!userId || !pet) {
    return null; // UserProvider will handle redirect
  }

  const petStage = getAPIStageNameFunc(pet.stage);
  const currentLevelStrength = pet.strength % 120;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--tp-primary-50)' }}>
        {/* Entrance Animation */}
        {showEntrance && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'var(--tp-grayscale-800)' }}
          >
            <div className="relative">
              <div
                className="absolute inset-0 border-8 animate-pulse"
                style={{
                  borderColor: 'var(--tp-secondary-500)',
                  animation: 'fade-out 1.5s ease-out forwards'
                }}
              />
              <div
                className="text-6xl animate-bounce"
                style={{
                  animation: 'scale-in 1s ease-out'
                }}
              >
                🐣
              </div>
            </div>
          </div>
        )}

        <AppSidebar />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header
            className="h-16 flex items-center px-4 border-b"
            style={{
              backgroundColor: 'var(--tp-white)',
              borderColor: 'var(--tp-primary-200)'
            }}
          >
            <SidebarTrigger className="mr-4" />
            <div className="flex items-center gap-3 flex-1">
              <Popover open={namePopoverOpen} onOpenChange={setNamePopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="tp-h2-semibold flex items-center gap-2 hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--tp-primary-700)' }}
                  >
                    {pet.name}
                    <img src={EditIconSvg} alt="edit" className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="tp-h3-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                      修改寵物名稱
                    </div>
                    <Input
                      placeholder="輸入新名稱"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameEdit();
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setNamePopoverOpen(false);
                          setEditingName("");
                        }}
                        className="flex-1"
                      >
                        取消
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleNameEdit}
                        className="flex-1"
                      >
                        確認
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <span className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                {getStageName(pet.stage)}
              </span>

              <div
                className="ml-auto px-3 py-1 rounded-full tp-body-semibold"
                style={{
                  backgroundColor: 'var(--tp-secondary-100)',
                  color: 'var(--tp-secondary-700)'
                }}
              >
                Lv.{pet.level}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 overflow-auto">
            <div className="max-w-md mx-auto space-y-4">
              {/* Pet Display */}
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
                <div className="flex justify-center">
                  <Pet stage={petStage} mood={pet.mood} />
                </div>

                <div
                  className="p-4 rounded-lg relative"
                  style={{ backgroundColor: 'var(--tp-primary-100)' }}
                >
                  <div
                    className="absolute -top-2 left-8 w-0 h-0"
                    style={{
                      borderLeft: '10px solid transparent',
                      borderRight: '10px solid transparent',
                      borderBottom: '10px solid var(--tp-primary-100)'
                    }}
                  />
                  <p className="tp-body-regular" style={{ color: 'var(--tp-grayscale-800)' }}>
                    {getChickenMessage()}
                  </p>
                </div>
              </Card>

              {/* Stats */}
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
                <h3 className="tp-h3-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>能力值</h3>
                <StatBar
                  label="力量值"
                  value={currentLevelStrength}
                  max={120}
                  icon="💪"
                />
                <StatBar
                  label="體力值"
                  value={pet.stamina}
                  max={900}
                  icon="❤️"
                />
                <StatBar
                  label="心情"
                  value={pet.mood}
                  max={100}
                  icon="😊"
                />
              </Card>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <ActionButton
                  icon={Dumbbell}
                  label="運動"
                  onClick={() => navigate("/exercise")}
                />
                <ActionButton
                  icon={Map}
                  label="旅遊"
                  onClick={() => navigate("/travel")}
                  variant="accent"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
