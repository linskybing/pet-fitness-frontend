import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import { QuestLocation, UserLocation } from '@/types/quest';
import { Navigation, MapPin, Trophy, CheckCircle2 } from 'lucide-react';
import TPButton from './TPButton/TPButton';
import { Card } from './ui/card';

// 修復 Leaflet 預設圖標問題
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 自定義用戶位置圖標
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10" fill="#3b82f6" fill-opacity="0.3"/>
      <circle cx="12" cy="12" r="3" fill="#3b82f6"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// 任務地點圖標
const createQuestIcon = (status: QuestLocation['status'], category: string) => {
  const color = status === 'completed' ? '#22c55e' : 
                status === 'in-progress' ? '#f59e0b' : 
                category === '運動場館' ? '#ec4899' : '#8b5cf6';
  
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3" fill="white" stroke="${color}"/>
      </svg>
    `),
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// 移動到指定位置的組件 - 只在掛載時執行一次，立即顯示不要動畫
function FlyToLocation({ target, questId, onComplete }: { 
  target: [number, number];
  questId: string;
  onComplete: () => void;
}) {
  const map = useMap();
  const hasMovedRef = useRef(false);
  
  useEffect(() => {
    // 只執行一次
    if (hasMovedRef.current) {
      return;
    }
    
    hasMovedRef.current = true;
    
    // 驗證目標位置是否有效
    if (target && target[0] && target[1]) {
      // 立即設置視角，不要動畫效果
      map.setView(target, 16, { animate: false });
      
      // 直接通知完成，不自動打開 popup（用戶可以自己點擊）
      setTimeout(() => {
        onComplete();
      }, 100);
    } else {
      onComplete();
    }
  }, []); // 空依賴陣列，只在掛載時執行
  
  return null;
}

// 路線規劃組件
function RoutingControl({ start, end }: { 
  start: [number, number]; 
  end: [number, number]; 
}) {
  const map = useMap();
  const routingControlRef = useRef<any>(null);
  
  useEffect(() => {
    if (!start || !end) return;
    
    // 如果路線控制器已存在，先移除
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      } catch (e) {
        console.warn('移除舊路線控制器時發生錯誤:', e);
      }
    }
    
    const newRoutingControl = (L.Routing as any).control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: false,
      lineOptions: {
        styles: [{ color: '#6366f1', weight: 4, opacity: 0.7 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: () => null,
      router: (L.Routing as any).osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        timeout: 10000,
        suppressDemoServerWarning: true // 隱藏 OSRM 演示服務器警告
      })
    }).addTo(map);
    
    // 隱藏路線指示面板
    const container = newRoutingControl.getContainer();
    if (container) {
      container.style.display = 'none';
    }
    
    routingControlRef.current = newRoutingControl;
    
    return () => {
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
          routingControlRef.current = null;
        } catch (e) {
          console.warn('清理路線控制器時發生錯誤:', e);
        }
      }
    };
  }, [map, start[0].toFixed(3), start[1].toFixed(3), end[0].toFixed(3), end[1].toFixed(3)]);
  
  return null;
}

// 檢查點是否在地圖視野內的 Hook - 暫時返回 null 避免無限循環
function useMapBounds() {
  // 暫時禁用以避免無限循環
  return null;
}

// 回到我的位置按鈕組件
function LocationButton({ userLocation, hasRealLocation }: { userLocation: UserLocation; hasRealLocation: boolean }) {
  const map = useMap();
  
  const handleClick = () => {
    if (hasRealLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.5 });
    }
  };
  
  return (
    <div 
      className="leaflet-top leaflet-right" 
      style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px', 
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <button
          onClick={handleClick}
          disabled={!hasRealLocation}
          className="rounded-lg shadow-lg p-3 transition-all hover:shadow-xl disabled:opacity-50"
          style={{
            backgroundColor: 'var(--tp-white)',
            border: '2px solid var(--tp-primary-500)',
            cursor: hasRealLocation ? 'pointer' : 'not-allowed'
          }}
          title="回到我的位置"
        >
          <Navigation 
            className="w-5 h-5" 
            style={{ color: hasRealLocation ? 'var(--tp-primary-600)' : 'var(--tp-grayscale-400)' }}
          />
        </button>
      </div>
    </div>
  );
}

interface MapViewProps {
  quests: QuestLocation[];
  onAcceptQuest: (quest: QuestLocation) => void;
  onCompleteQuest: (quest: QuestLocation) => void;
  devMode: boolean;
  flyToQuest?: QuestLocation | null;
  onFlyComplete?: () => void;
  activeQuestId?: string | null;
}

// 任務標記組件 - 使用 hook 獲取邊界
function QuestMarkers({ 
  quests, 
  userLocation, 
  devMode, 
  flyToQuest,
  onAcceptQuest, 
  onCompleteQuest,
  calculateDistance,
  isInRange,
  getBonusText,
  createQuestIcon
}: any) {
  const mapBounds = useMapBounds();
  
  return (
    <>
      {quests.map((quest: QuestLocation) => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          quest.lat,
          quest.lng
        );
        const inRange = isInRange(quest);
        const isFocused = flyToQuest?.id === quest.id;
        
        // 檢查任務是否在當前地圖視野內
        const isInView = mapBounds ? 
          mapBounds.contains([quest.lat, quest.lng]) : 
          true;

        return (
          <Marker
            key={`marker-${quest.id}-${quest.status}-${devMode}`}
            position={[quest.lat, quest.lng]}
            icon={createQuestIcon(quest.status, quest.category)}
          >
              <Popup 
                maxWidth={300}
                autoClose={true}
                closeOnClick={true}
              >
                <div className="space-y-2 p-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: 'var(--tp-primary-500)' }} />
                    <span className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-800)' }}>
                      {quest.name}
                    </span>
                  </div>
                  
                  <span 
                    className="inline-block px-2 py-1 rounded tp-caption"
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

                  <p className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                    {quest.description}
                  </p>

                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" style={{ color: 'var(--tp-secondary-500)' }} />
                    <span className="tp-caption" style={{ color: 'var(--tp-secondary-700)' }}>
                      {getBonusText(quest.bonus)}
                    </span>
                  </div>

                  <div className="pt-2 border-t">
                    <p className="tp-caption mb-2" style={{ 
                      color: inRange ? 'var(--tp-success-600)' : 'var(--tp-grayscale-600)' 
                    }}>
                      距離: {Math.round(distance)}m {inRange && '✓ 在範圍內'}
                    </p>
                    
                    {quest.status === 'available' ? (
                      <TPButton
                        variant="primary"
                        className="w-full"
                        disabled={!inRange}
                        onClick={() => onAcceptQuest(quest)}
                      >
                        接受任務
                      </TPButton>
                    ) : quest.status === 'in-progress' ? (
                      <TPButton
                        variant="secondary"
                        className="w-full"
                        disabled={!inRange}
                        onClick={() => onCompleteQuest(quest)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        完成打卡
                      </TPButton>
                    ) : quest.status === 'completed' ? (
                      <div 
                        className="text-center py-2 rounded"
                        style={{ 
                          backgroundColor: 'var(--tp-success-100)',
                          color: 'var(--tp-success-700)'
                        }}
                      >
                        <CheckCircle2 className="w-4 h-4 inline mr-1" />
                        已完成
                      </div>
                    ) : null}
                  </div>
                </div>
              </Popup>

              {/* 任務範圍圓圈 - 只顯示在視野內的圓圈 */}
              {isInView && (
                <Circle
                  center={[quest.lat, quest.lng]}
                  radius={quest.requiredDistance || 100}
                  pathOptions={{
                    color: quest.status === 'completed' ? '#22c55e' : 
                           quest.status === 'in-progress' ? '#f59e0b' : '#8b5cf6',
                    fillColor: quest.status === 'completed' ? '#22c55e' : 
                               quest.status === 'in-progress' ? '#f59e0b' : '#8b5cf6',
                    fillOpacity: isFocused ? 0.2 : 0.1,
                    dashArray: '5, 10',
                  }}
                />
              )}
            </Marker>
        );
      })}
    </>
  );
}

export const MapView = ({ quests, onAcceptQuest, onCompleteQuest, devMode, flyToQuest, onFlyComplete, activeQuestId }: MapViewProps) => {
  // 預設使用台北市中心，不等待 GPS
  const [userLocation, setUserLocation] = useState<UserLocation>({ lat: 25.0330, lng: 121.5654 });
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<QuestLocation | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasRealLocation, setHasRealLocation] = useState(false);

  // 獲取用戶位置（背景執行，不阻塞地圖顯示）
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('您的瀏覽器不支援地理定位，顯示台北市中心');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setHasRealLocation(true);
        setLocationError(null);
      },
      (error) => {
        console.error('定位錯誤:', error);
        setLocationError('無法取得您的位置，顯示台北市中心');
      },
      {
        enableHighAccuracy: false, // 改為 false 以加快首次定位
        timeout: 5000, // 縮短超時時間
        maximumAge: 30000, // 允許使用 30 秒內的快取位置
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 計算兩點之間的距離（米）
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // 地球半徑（米）
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 檢查用戶是否在任務範圍內
  const isInRange = (quest: QuestLocation): boolean => {
    if (devMode) return true; // 開發者模式下永遠在範圍內
    if (!userLocation) return false;
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      quest.lat,
      quest.lng
    );
    return distance <= (quest.requiredDistance || 100); // 預設100米內
  };

  const getBonusText = (bonus: { strength?: number; mood?: number }) => {
    const parts = [];
    if (bonus.strength) parts.push(`力量 +${bonus.strength}`);
    if (bonus.mood) parts.push(`心情 +${bonus.mood}`);
    return parts.join(', ');
  };

  return (
    <div className="space-y-4">
      {locationError && (
        <Card className="p-3" style={{ backgroundColor: 'var(--tp-warning-50)', borderColor: 'var(--tp-warning-300)' }}>
          <p className="tp-caption" style={{ color: 'var(--tp-warning-700)' }}>
            ⚠️ {locationError}
          </p>
        </Card>
      )}
      
      {!hasRealLocation && !locationError && (
        <Card className="p-3" style={{ backgroundColor: 'var(--tp-info-50)', borderColor: 'var(--tp-info-300)' }}>
          <p className="tp-caption" style={{ color: 'var(--tp-info-700)' }}>
            📍 正在取得您的精確位置...
          </p>
        </Card>
      )}

      <div className="rounded-lg overflow-hidden shadow-lg relative" style={{ height: '500px' }}>
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-50" 
               style={{ backgroundColor: 'var(--tp-grayscale-100)' }}>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full border-4 border-t-transparent animate-spin" 
                   style={{ borderColor: 'var(--tp-primary-500)', borderTopColor: 'transparent' }}>
              </div>
              <p className="tp-body-semibold" style={{ color: 'var(--tp-grayscale-700)' }}>
                地圖載入中...
              </p>
            </div>
          </div>
        )}
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
          whenReady={() => setMapLoaded(true)}
          minZoom={11} // 最小縮放等級
          maxZoom={18} // 最大縮放等級
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              load: () => setMapLoaded(true)
            }}
          />
          
          {/* 移動到指定地點 - 只在從列表點擊時執行一次，立即顯示 */}
          {flyToQuest && (
            <FlyToLocation 
              target={[flyToQuest.lat, flyToQuest.lng]}
              questId={flyToQuest.id}
              onComplete={onFlyComplete}
            />
          )}
          
          {/* 路線指引 - 當有進行中的任務時顯示 */}
          {activeQuestId && (() => {
            const activeQuest = quests.find(q => q.id === activeQuestId && q.status === 'in-progress');
            if (activeQuest) {
              return (
                <RoutingControl
                  key={`route-${activeQuestId}`}
                  start={[userLocation.lat, userLocation.lng]}
                  end={[activeQuest.lat, activeQuest.lng]}
                />
              );
            }
            return null;
          })()}
          
          {/* 回到我的位置按鈕 */}
          <LocationButton userLocation={userLocation} hasRealLocation={hasRealLocation} />

          {/* 用戶位置標記 - 只在有真實位置時顯示 */}
          {hasRealLocation && (
            <>
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="tp-body-semibold mb-1" style={{ color: 'var(--tp-primary-700)' }}>
                      您的位置
                    </p>
                    {userLocation.accuracy && (
                      <p className="tp-caption" style={{ color: 'var(--tp-grayscale-600)' }}>
                        精確度: ±{Math.round(userLocation.accuracy)}m
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* 用戶位置精確度圓圈 */}
              {userLocation.accuracy && (
                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={userLocation.accuracy}
                  pathOptions={{
                    color: '#3b82f6',
                    fillColor: '#3b82f6',
                    fillOpacity: 0.1,
                  }}
                />
              )}
            </>
          )}



          {/* 任務地點標記 */}
          <QuestMarkers
            quests={quests}
            userLocation={userLocation}
            devMode={devMode}
            flyToQuest={flyToQuest}
            onAcceptQuest={onAcceptQuest}
            onCompleteQuest={onCompleteQuest}
            calculateDistance={calculateDistance}
            isInRange={isInRange}
            getBonusText={getBonusText}
            createQuestIcon={createQuestIcon}
          />
        </MapContainer>
      </div>

      {/* 圖例 */}
      <Card className="p-4" style={{ backgroundColor: 'var(--tp-white)' }}>
        <div className="tp-body-semibold mb-2" style={{ color: 'var(--tp-grayscale-800)' }}>
          地圖圖例
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="tp-caption">您的位置</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span className="tp-caption">可接任務</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="tp-caption">進行中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="tp-caption">已完成</span>
          </div>
        </div>
      </Card>

      {/* 任務提示 */}
      <Card className="p-4" style={{ backgroundColor: 'var(--tp-secondary-50)', borderColor: 'var(--tp-secondary-300)' }}>
        <p className="tp-body-regular" style={{ color: 'var(--tp-secondary-800)' }}>
          💡 點擊地圖上的標記查看任務詳情。需要在任務範圍內（預設100米）才能接受或完成任務！
        </p>
      </Card>
    </div>
  );
};

export default MapView;
