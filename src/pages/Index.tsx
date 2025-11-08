import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Pet from "@/components/Pet";
import StatBar from "@/components/StatBar";
import ActionButton from "@/components/ActionButton";
import { Dumbbell, Map } from "lucide-react";
import chickenSport from "@/assets/image/chicken_sport.png";
import chickenTravel from "@/assets/image/chicken_travel.png";
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
  const [entranceStage, setEntranceStage] = useState<'egg' | 'hatching' | 'done'>('egg');
  const [typedText, setTypedText] = useState("");

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

  // 入場動畫：egg 旋轉 -> hatch pop
  useEffect(() => {
    const rotateDur = 2000; // ms (match egg-rotate 2s)
    const hatchDur = 1000; // ms

    const t1 = setTimeout(() => {
      setEntranceStage('hatching');
    }, rotateDur);

    const t2 = setTimeout(() => {
      setEntranceStage('done');
      setShowEntrance(false);
    }, rotateDur + hatchDur);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // 打字機效果（入場期間顯示）
  useEffect(() => {
    const title = "Pet Fitness";
    let idx = 0;
    setTypedText("");
    const typeInterval = setInterval(() => {
      setTypedText((prev) => prev + title[idx]);
      idx += 1;
      if (idx >= title.length) {
        clearInterval(typeInterval);
      }
    }, 120);

    return () => clearInterval(typeInterval);
  }, []);


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
        {/* Entrance Animation: egg rotate -> hatch -> pop into small */}
        {showEntrance && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: '#EDF8FA' }}
          >
            {/* Inline keyframes for the small set of animations */}
            <style>{`
              @keyframes egg-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes hatch-pop { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
              @keyframes overlay-fade { from { opacity: 1; } to { opacity: 0; } }
              @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
            `}</style>

            <div className="relative flex items-center justify-center">
              {entranceStage === 'egg' && (
                <div
                  className="text-6xl"
                  style={{
                    animation: 'egg-rotate 2s linear infinite',
                    display: 'inline-block'
                  }}
                >
                  🥚
                </div>
              )}

              {entranceStage === 'hatching' && (
                <div
                  className="text-6xl"
                  style={{
                    animation: 'hatch-pop 1s ease-out forwards',
                    display: 'inline-block'
                  }}
                >
                  🐣
                </div>
              )}
              {/* 打字機文字 */}
              <div className="w-full flex justify-center mt-4">
                <div style={{ fontFamily: 'monospace', fontSize: 18, color: 'var(--tp-grayscale-800)' }}>
                  {typedText}
                  <span style={{ display: 'inline-block', width: 10, marginLeft: 4, animation: 'blink 1s step-end infinite' }}>|</span>
                </div>
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
              backgroundColor: '#EDF8FA',
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
                            {/* Stats */}
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
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

              {/* Pet Display */}
              <div className="flex justify-center">
                <Pet
                  stage={petStage}
                  mood={pet.mood}
                  strength={currentLevelStrength}
                  strengthMax={120}
                  stamina={pet.stamina}
                  staminaMax={900}
                  startMessageTimer={!showEntrance}
                />
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <ActionButton
                  icon={chickenSport}
                  label="來去運動"
                  onClick={() => navigate("/exercise")}
                />
                <ActionButton
                  icon={chickenTravel}
                  label="旅遊小雞"
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
