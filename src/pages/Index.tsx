import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
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

const Index = () => {
  const navigate = useNavigate();
  const [petName, setPetName] = useState("我的手雞");
  const [editingName, setEditingName] = useState("");
  const [namePopoverOpen, setNamePopoverOpen] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  
  const [stats, setStats] = useState({
    strength: 45, // 力量值，每10秒運動+1，每級120點
    stamina: 900, // 體力值，每天900點，每10秒運動-1
    mood: 80, // 心情值
    level: 1,
    currentLevelStrength: 45, // 當前等級的力量值進度
  });

  // 根據等級計算寵物階段 (lv5的倍數需要突破)
  const getPetStage = (level: number): "egg" | "small" | "medium" | "large" | "buff" => {
    if (level < 5) return "egg";
    if (level < 10) return "small";
    if (level < 15) return "medium";
    if (level < 20) return "large";
    return "buff";
  };

  const [petStage, setPetStage] = useState<"egg" | "small" | "medium" | "large" | "buff">(
    getPetStage(stats.level)
  );

  const getStageName = (stage: "egg" | "small" | "medium" | "large" | "buff") => {
    switch (stage) {
      case "egg": return "蛋";
      case "small": return "小雞";
      case "medium": return "中雞";
      case "large": return "大雞";
      case "buff": return "大胸雞";
    }
  };

  const getChickenMessage = () => {
    const { strength, stamina, mood, currentLevelStrength } = stats;
    
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

  // 入場動畫
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowEntrance(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleNameEdit = () => {
    if (editingName.trim()) {
      setPetName(editingName.trim());
      setNamePopoverOpen(false);
      setEditingName("");
    }
  };

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
              <div className="tp-h2-semibold flex items-center gap-2" style={{ color: 'var(--tp-primary-700)' }}>
                <span>{petName}</span>
                <Popover open={namePopoverOpen} onOpenChange={setNamePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button className="hover:opacity-70 transition-opacity p-1 -m-1 rounded">
                      <img src={EditIconSvg} alt="編輯" className="w-4 h-4" />
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
                      <TPButton
                        variant="secondary"
                        onClick={() => {
                          setNamePopoverOpen(false);
                          setEditingName("");
                        }}
                        className="flex-1"
                      >
                        取消
                      </TPButton>
                      <TPButton
                        variant="primary"
                        onClick={handleNameEdit}
                        className="flex-1"
                      >
                        確認
                      </TPButton>
                    </div>
                  </div>
                </PopoverContent>
                </Popover>
              </div>
              
              <span className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                {getStageName(petStage)}
              </span>
              
              <div 
                className="ml-auto px-3 py-1 rounded-full tp-body-semibold"
                style={{ 
                  backgroundColor: 'var(--tp-secondary-100)',
                  color: 'var(--tp-secondary-700)'
                }}
              >
                Lv.{stats.level}
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 overflow-auto">
            <div className="max-w-md mx-auto space-y-4">
              {/* Pet Display */}
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
                <div className="flex justify-center">
                  <Pet stage={petStage} mood={stats.mood} />
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
                  value={stats.currentLevelStrength} 
                  max={120} 
                  icon={StrengthIconSvg}
                  iconType="svg"
                />
                <StatBar 
                  label="體力值" 
                  value={stats.stamina} 
                  max={900} 
                  icon={HeartIconSvg}
                  iconType="svg"
                />
                <StatBar 
                  label="心情" 
                  value={stats.mood} 
                  max={100} 
                  icon={SmileIconSvg}
                  iconType="svg"
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
