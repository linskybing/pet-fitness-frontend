import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
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

  // Note: message generation moved into Pet component. Parent no longer provides a fallback message.

  // 入場動畫：egg 旋轉 -> hatch pop -> 顯示 small 並關閉 overlay
  const [entranceStage, setEntranceStage] = useState<'egg' | 'hatching' | 'done'>('egg');
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    // 確保一開始是蛋狀態
    setPetStage('egg');

    const rotateDur = 2000; // ms (match egg-rotate 2s)
    const hatchDur = 1000; // ms

    const t1 = setTimeout(() => {
      setEntranceStage('hatching');
    }, rotateDur);

    const t2 = setTimeout(() => {
      // 完成孵化，將 pet stage 改為 small，並關閉入場 overlay
      setPetStage('small');
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
              
              
              
              <div 
                className="ml-auto px-3 py-1 rounded-full tp-body-semibold"
                style={{ 
                  backgroundColor: 'var(--tp-secondary-100)',
                  color: 'var(--tp-secondary-700)'
                }}
              >
                Lv.{stats.level}
                <span className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                {getStageName(petStage)}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 overflow-auto">
            <div className="max-w-md mx-auto space-y-4">
                            {/* Stats */}
              <Card className="p-3 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
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
              
              {/* Pet Display (no white frame). Speech bubble moves with the pet via Pet.message prop */}
              <div className="flex justify-center">
                <Pet
                  stage={petStage}
                  mood={stats.mood}
                  startMessageTimer={!showEntrance}
                  strength={stats.currentLevelStrength}
                  strengthMax={120}
                  stamina={stats.stamina}
                  staminaMax={900}
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
