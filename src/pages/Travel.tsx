import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Trophy, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import TPButton from "@/components/TPButton/TPButton";

const landmarks = [
  { 
    name: "台北101", 
    description: "台北最高地標", 
    bonus: { strength: 10, mood: 5 },
    category: "景點",
    lat: 25.0340,
    lng: 121.5645
  },
  { 
    name: "象山步道", 
    description: "登高望遠好去處", 
    bonus: { strength: 15, mood: 10 },
    category: "景點",
    lat: 25.0236,
    lng: 121.5719
  },
  { 
    name: "大安森林公園", 
    description: "都市綠洲", 
    bonus: { mood: 15 },
    category: "公園",
    lat: 25.0263,
    lng: 121.5436
  },
  { 
    name: "陽明山國家公園", 
    description: "自然步道天堂", 
    bonus: { strength: 20, mood: 15 },
    category: "景點",
    lat: 25.1622,
    lng: 121.5458
  },
  { 
    name: "北投溫泉", 
    description: "放鬆身心靈", 
    bonus: { mood: 20 },
    category: "景點",
    lat: 25.1373,
    lng: 121.5081
  },
  { 
    name: "天母運動公園", 
    description: "運動設施完善", 
    bonus: { strength: 12, mood: 8 },
    category: "運動場館",
    lat: 25.1163,
    lng: 121.5283
  },
  { 
    name: "台北小巨蛋", 
    description: "大型體育館", 
    bonus: { strength: 15 },
    category: "運動場館",
    lat: 25.0518,
    lng: 121.5494
  },
  { 
    name: "河濱自行車道", 
    description: "騎車運動好去處", 
    bonus: { strength: 18, mood: 12 },
    category: "運動場館",
    lat: 25.0408,
    lng: 121.5094
  },
];

const Travel = () => {
  const navigate = useNavigate();
  const [selectedLandmark, setSelectedLandmark] = useState<typeof landmarks[0] | null>(null);

  const handleCheckIn = (landmark: typeof landmarks[0]) => {
    // 這裡未來會實作GPS定位檢查
    alert(`打卡成功！獲得獎勵：${landmark.bonus.strength ? `力量值 +${landmark.bonus.strength}` : ''} ${landmark.bonus.mood ? `心情 +${landmark.bonus.mood}` : ''}`);
  };

  const getBonusText = (bonus: { strength?: number; mood?: number }) => {
    const parts = [];
    if (bonus.strength) parts.push(`力量 +${bonus.strength}`);
    if (bonus.mood) parts.push(`心情 +${bonus.mood}`);
    return parts.join(', ');
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--tp-primary-50)' }}>
      <div className="max-w-md mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
          style={{ color: 'var(--tp-primary-700)' }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <div className="tp-h2-semibold" style={{ color: 'var(--tp-primary-700)' }}>
          台北市打卡清單
        </div>

        {selectedLandmark && (
          <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-300)' }}>
            <div 
              className="rounded-xl p-6 space-y-4"
              style={{ background: 'linear-gradient(135deg, var(--tp-primary-200), var(--tp-secondary-200))' }}
            >
              <div className="flex items-center justify-center">
                <div 
                  className="rounded-full p-4"
                  style={{ backgroundColor: 'var(--tp-primary-500)' }}
                >
                  <MapPin className="w-8 h-8" style={{ color: 'var(--tp-white)' }} />
                </div>
              </div>
              
              <div className="text-center">
                <div 
                  className="inline-block px-3 py-1 rounded-full tp-caption mb-2"
                  style={{ 
                    backgroundColor: 'var(--tp-white)',
                    color: 'var(--tp-primary-700)'
                  }}
                >
                  {selectedLandmark.category}
                </div>
                <h2 className="tp-h2-semibold mb-2" style={{ color: 'var(--tp-grayscale-900)' }}>
                  {selectedLandmark.name}
                </h2>
                <p className="tp-body-regular" style={{ color: 'var(--tp-grayscale-700)' }}>
                  {selectedLandmark.description}
                </p>
              </div>

              <div 
                className="rounded-lg p-4 flex items-center justify-between"
                style={{ backgroundColor: 'var(--tp-white)' }}
              >
                <span className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>完成獎勵</span>
                <span className="tp-body-semibold flex items-center gap-1" style={{ color: 'var(--tp-secondary-700)' }}>
                  <Trophy className="w-4 h-4" />
                  {getBonusText(selectedLandmark.bonus)}
                </span>
              </div>
            </div>

            <TPButton 
              variant="primary" 
              className="w-full"
              onClick={() => handleCheckIn(selectedLandmark)}
            >
              <Navigation className="w-4 h-4 mr-2" />
              前往打卡
            </TPButton>
          </Card>
        )}

        <Card className="p-6 space-y-4" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}>
          <div className="grid grid-cols-2 gap-2 px-1 text-xs text-muted-foreground border-b pb-2">
            <div>地點名稱</div>
            <div className="text-right">獎勵內容</div>
          </div>
          <div className="space-y-2 pt-2">
            {landmarks.map((landmark, index) => (
              <div
                key={index}
                role="button"
                tabIndex={0}
                title={landmark.description}
                aria-label={`選擇 ${landmark.name}，獎勵：${getBonusText(landmark.bonus)}`}
                className="rounded-lg p-3 cursor-pointer transition-all hover:shadow-md flex items-start justify-between focus:outline-none focus:ring-2 focus:ring-offset-1"
                style={{ 
                  backgroundColor: selectedLandmark?.name === landmark.name 
                    ? 'var(--tp-primary-100)' 
                    : 'var(--tp-grayscale-50)',
                  borderLeft: `4px solid var(--tp-primary-500)`
                }}
                onClick={() => setSelectedLandmark(landmark)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedLandmark(landmark);
                  }
                }}
              >
                <div className="flex-1">
                  <div className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                    {landmark.name}
                  </div>

                </div>
                <div className="tp-caption text-right" style={{ color: 'var(--tp-secondary-600)', minWidth: 120 }}>
                  {getBonusText(landmark.bonus)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4" style={{ backgroundColor: 'var(--tp-secondary-50)', borderColor: 'var(--tp-secondary-300)' }}>
          <p className="tp-body-regular text-center" style={{ color: 'var(--tp-secondary-800)' }}>
            💡 點選景點後可前往打卡，獲得力量值與心情值獎勵！
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Travel;
