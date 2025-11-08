import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Trophy, Navigation, Map, Code, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect, useCallback } from "react";
import TPButton from "@/components/TPButton/TPButton";
import MapView from "@/components/MapView";
import { QuestLocation } from "@/types/quest";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useInView } from "react-intersection-observer";

const initialQuests: QuestLocation[] = [
  { 
    id: "quest-1",
    name: "台北101", 
    description: "台北最高地標", 
    bonus: { strength: 10, mood: 5 },
    category: "景點",
    lat: 25.0340,
    lng: 121.5645,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-2",
    name: "象山步道", 
    description: "登高望遠好去處", 
    bonus: { strength: 15, mood: 10 },
    category: "景點",
    lat: 25.0236,
    lng: 121.5719,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-3",
    name: "大安森林公園", 
    description: "都市綠洲", 
    bonus: { mood: 15 },
    category: "公園",
    lat: 25.0263,
    lng: 121.5436,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-4",
    name: "陽明山國家公園", 
    description: "自然步道天堂", 
    bonus: { strength: 20, mood: 15 },
    category: "景點",
    lat: 25.1622,
    lng: 121.5458,
    status: "available",
    requiredDistance: 150
  },
  { 
    id: "quest-5",
    name: "北投溫泉", 
    description: "放鬆身心靈", 
    bonus: { mood: 20 },
    category: "景點",
    lat: 25.1373,
    lng: 121.5081,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-6",
    name: "天母運動公園", 
    description: "運動設施完善", 
    bonus: { strength: 12, mood: 8 },
    category: "運動場館",
    lat: 25.1163,
    lng: 121.5283,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-7",
    name: "台北小巨蛋", 
    description: "大型體育館", 
    bonus: { strength: 15 },
    category: "運動場館",
    lat: 25.0518,
    lng: 121.5494,
    status: "available",
    requiredDistance: 100
  },
  { 
    id: "quest-8",
    name: "河濱自行車道", 
    description: "騎車運動好去處", 
    bonus: { strength: 18, mood: 12 },
    category: "運動場館",
    lat: 25.0408,
    lng: 121.5094,
    status: "available",
    requiredDistance: 100
  },
];

const Travel = () => {
  const navigate = useNavigate();
  const [quests, setQuests] = useState<QuestLocation[]>(initialQuests);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [devMode, setDevMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayedCount, setDisplayedCount] = useState(10);
  const [flyToQuest, setFlyToQuest] = useState<QuestLocation | null>(null);
  
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
  });

  const handleAcceptQuest = (quest: QuestLocation) => {
    // 將其他進行中的任務取消，只保留新接受的任務
    setQuests(prev => prev.map(q => {
      if (q.status === "in-progress") {
        return { ...q, status: "available" as const };
      }
      if (q.id === quest.id) {
        return { ...q, status: "in-progress" as const };
      }
      return q;
    }));
    toast.success(`已接受任務：${quest.name}`, {
      description: "請前往目的地完成打卡！之前的任務已自動取消。"
    });
  };

  const handleCompleteQuest = (quest: QuestLocation) => {
    setQuests(prev => prev.map(q => 
      q.id === quest.id ? { ...q, status: "completed" as const } : q
    ));
    
    const bonusText = getBonusText(quest.bonus);
    toast.success(`打卡成功！`, {
      description: `獲得獎勵：${bonusText}`
    });
    
    // 這裡可以更新實際的寵物屬性
    // updatePetStats(quest.bonus);
  };

  // 篩選任務
  const filteredQuests = useMemo(() => {
    if (!searchTerm) return quests;
    return quests.filter(quest => 
      quest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quest.category.includes(searchTerm)
    );
  }, [quests, searchTerm]);

  const availableQuests = useMemo(() => 
    filteredQuests.filter(q => q.status === "available"),
    [filteredQuests]
  );
  
  const inProgressQuests = useMemo(() => 
    filteredQuests.filter(q => q.status === "in-progress"),
    [filteredQuests]
  );
  
  const completedQuests = useMemo(() => 
    filteredQuests.filter(q => q.status === "completed"),
    [filteredQuests]
  );

  // 當使用者滾動到底部時，載入更多
  useEffect(() => {
    if (inView && displayedCount < availableQuests.length) {
      // 使用 setTimeout 來避免快速觸發
      const timer = setTimeout(() => {
        setDisplayedCount(prev => Math.min(prev + 10, availableQuests.length));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [inView, displayedCount, availableQuests.length]);

  const getBonusText = (bonus: { strength?: number; mood?: number }) => {
    const parts = [];
    if (bonus.strength) parts.push(`力量 +${bonus.strength}`);
    if (bonus.mood) parts.push(`心情 +${bonus.mood}`);
    return parts.join(', ');
  };

  const handleQuestClick = useCallback((quest: QuestLocation) => {
    setFlyToQuest(quest);
    setViewMode("map");
  }, []);

  const handleFlyComplete = useCallback(() => {
    setFlyToQuest(null);
  }, []);

  // 當從地圖模式切換到列表模式時，清除 flyToQuest
  useEffect(() => {
    if (viewMode === "list") {
      setFlyToQuest(null);
    }
  }, [viewMode]);

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--tp-primary-50)' }}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            style={{ color: 'var(--tp-primary-700)' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>

          <div className="flex gap-2">
            <TPButton
              variant={viewMode === "map" ? "primary" : "secondary"}
              onClick={() => setViewMode("map")}
            >
              <Map className="w-4 h-4 mr-2" />
              地圖模式
            </TPButton>
            <TPButton
              variant={viewMode === "list" ? "primary" : "secondary"}
              onClick={() => setViewMode("list")}
            >
              <MapPin className="w-4 h-4 mr-2" />
              列表模式
            </TPButton>
          </div>
        </div>

        <div className="tp-h2-semibold" style={{ color: 'var(--tp-primary-700)' }}>
          旅遊突破
        </div>

        {/* 開發者模式開關 */}
        <Card className="p-3" style={{ backgroundColor: 'var(--tp-white)' }}>
          <div className="flex items-center justify-between">
            <Label htmlFor="dev-mode" className="flex items-center gap-2 tp-body-semibold" style={{ color: 'var(--tp-grayscale-700)' }}>
              <Code className="w-5 h-5" />
              開發者模式
            </Label>
            <Switch
              id="dev-mode"
              checked={devMode}
              onCheckedChange={setDevMode}
            />
          </div>
          {devMode && (
            <p className="tp-caption mt-2" style={{ color: 'var(--tp-warning-600)' }}>
              已啟用開發者模式，將忽略所有距離限制。
            </p>
          )}
        </Card>

        {/* 任務統計 */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center" style={{ backgroundColor: 'var(--tp-white)' }}>
            <div className="tp-h3-semibold mb-1" style={{ color: 'var(--tp-primary-600)' }}>
              {availableQuests.length}
            </div>
            <div className="tp-caption" style={{ color: 'var(--tp-grayscale-600)' }}>
              可接任務
            </div>
          </Card>
          <Card className="p-4 text-center" style={{ backgroundColor: 'var(--tp-white)' }}>
            <div className="tp-h3-semibold mb-1" style={{ color: 'var(--tp-warning-600)' }}>
              {inProgressQuests.length}
            </div>
            <div className="tp-caption" style={{ color: 'var(--tp-grayscale-600)' }}>
              進行中
            </div>
          </Card>
          <Card className="p-4 text-center" style={{ backgroundColor: 'var(--tp-white)' }}>
            <div className="tp-h3-semibold mb-1" style={{ color: 'var(--tp-success-600)' }}>
              {completedQuests.length}
            </div>
            <div className="tp-caption" style={{ color: 'var(--tp-grayscale-600)' }}>
              已完成
            </div>
          </Card>
        </div>

        {/* 地圖視圖 */}
        {viewMode === "map" && (
          <MapView
            quests={filteredQuests}
            onAcceptQuest={handleAcceptQuest}
            onCompleteQuest={handleCompleteQuest}
            devMode={devMode}
            flyToQuest={flyToQuest}
            onFlyComplete={handleFlyComplete}
            activeQuestId={inProgressQuests[0]?.id} // 顯示第一個進行中任務的路線
          />
        )}

        {/* 列表視圖 */}
        {viewMode === "list" && (
          <div className="space-y-4">
            {/* 搜尋框 */}
            <Card className="p-4" style={{ backgroundColor: 'var(--tp-white)' }}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: 'var(--tp-grayscale-400)' }} />
                <Input
                  type="text"
                  placeholder="搜尋地點名稱、類別或描述..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setDisplayedCount(10); // 重置顯示數量
                  }}
                  className="pl-10 tp-body-regular"
                  style={{ 
                    borderColor: 'var(--tp-primary-300)',
                    backgroundColor: 'var(--tp-grayscale-50)'
                  }}
                />
              </div>
              {searchTerm && (
                <p className="tp-caption mt-2" style={{ color: 'var(--tp-grayscale-600)' }}>
                  找到 {filteredQuests.length} 個符合的地點
                </p>
              )}
            </Card>

            {/* 進行中的任務 */}
            {inProgressQuests.length > 0 && (
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-warning-300)' }}>
                <h3 className="tp-h3-semibold flex items-center gap-2" style={{ color: 'var(--tp-warning-700)' }}>
                  <Navigation className="w-5 h-5" />
                  進行中的任務
                </h3>
                <div className="space-y-2">
                  {inProgressQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className="rounded-lg p-4 cursor-pointer transition-all hover:shadow-md"
                      style={{ 
                        backgroundColor: 'var(--tp-warning-50)',
                        borderLeft: `4px solid var(--tp-warning-500)`
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                            {quest.name}
                          </div>
                          <span 
                            className="tp-caption px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: quest.category === '運動場館' 
                                ? 'var(--tp-secondary-100)' 
                                : 'var(--tp-primary-100)',
                              color: quest.category === '運動場館'
                                ? 'var(--tp-secondary-700)'
                                : 'var(--tp-primary-700)'
                            }}
                          >
                            {quest.category}
                          </span>
                        </div>
                        <div className="tp-caption" style={{ color: 'var(--tp-secondary-600)' }}>
                          {getBonusText(quest.bonus)}
                        </div>
                      </div>
                      <div className="tp-caption mb-3" style={{ color: 'var(--tp-grayscale-500)' }}>
                        {quest.description}
                      </div>
                      <TPButton 
                        variant="primary" 
                        className="w-full"
                        onClick={() => handleQuestClick(quest)}
                      >
                        <Map className="w-4 h-4 mr-2" />
                        在地圖上查看
                      </TPButton>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 可接的任務 */}
            <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
              <h3 className="tp-h3-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                {searchTerm ? '搜尋結果' : '台北運動景點'}
              </h3>
              <div className="space-y-2">
                {availableQuests.slice(0, displayedCount).map((quest) => (
                  <div
                    key={quest.id}
                    className="rounded-lg p-3 cursor-pointer transition-all hover:shadow-md"
                    style={{ 
                      backgroundColor: 'var(--tp-grayscale-50)',
                      borderLeft: `4px solid ${quest.category === '運動場館' ? 'var(--tp-secondary-500)' : 'var(--tp-primary-500)'}`
                    }}
                    onClick={() => handleQuestClick(quest)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                            {quest.name}
                          </div>
                          <span 
                            className="tp-caption px-2 py-0.5 rounded"
                            style={{ 
                              backgroundColor: quest.category === '運動場館' 
                                ? 'var(--tp-secondary-100)' 
                                : 'var(--tp-primary-100)',
                              color: quest.category === '運動場館'
                                ? 'var(--tp-secondary-700)'
                                : 'var(--tp-primary-700)'
                            }}
                          >
                            {quest.category}
                          </span>
                        </div>
                        <div className="tp-caption" style={{ color: 'var(--tp-grayscale-500)' }}>
                          {quest.description}
                        </div>
                      </div>
                      <div className="tp-caption text-right" style={{ color: 'var(--tp-secondary-600)' }}>
                        {getBonusText(quest.bonus)}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 無限滾動載入觸發點 */}
                {displayedCount < availableQuests.length && (
                  <div ref={loadMoreRef} className="py-4 text-center">
                    <div className="inline-flex items-center gap-2 tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--tp-primary-500)', borderTopColor: 'transparent' }}></div>
                      載入更多...
                    </div>
                  </div>
                )}
                
                {/* 已載入全部 */}
                {displayedCount >= availableQuests.length && availableQuests.length > 0 && (
                  <div className="py-4 text-center tp-caption" style={{ color: 'var(--tp-grayscale-500)' }}>
                    已顯示全部 {availableQuests.length} 個地點
                  </div>
                )}
              </div>
            </Card>

            {/* 已完成的任務 */}
            {completedQuests.length > 0 && (
              <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-success-50)', borderColor: 'var(--tp-success-300)' }}>
                <h3 className="tp-h3-semibold" style={{ color: 'var(--tp-success-700)' }}>
                  已完成的任務 ({completedQuests.length})
                </h3>
                <div className="space-y-2">
                  {completedQuests.map((quest) => (
                    <div
                      key={quest.id}
                      className="rounded-lg p-3"
                      style={{ 
                        backgroundColor: 'var(--tp-white)',
                        borderLeft: `4px solid var(--tp-success-500)`
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-700)' }}>
                          {quest.name}
                        </div>
                        <span className="tp-caption" style={{ color: 'var(--tp-success-600)' }}>
                          ✓ 已完成
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4" style={{ backgroundColor: 'var(--tp-secondary-50)', borderColor: 'var(--tp-secondary-300)' }}>
              <p className="tp-body-regular text-center" style={{ color: 'var(--tp-secondary-800)' }}>
                💡 點擊「地圖模式」查看任務位置並接受任務！
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Travel;
