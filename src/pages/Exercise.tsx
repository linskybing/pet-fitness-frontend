import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Square, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUser } from "@/hooks/useUser";
import { useLocation } from "@/hooks/useLocation";
import { useManualRain } from "@/hooks/useWeather";
import { logExercise, updateUserPet } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Activity = "idle" | "walking" | "jumping" | "unknown";

const Exercise: React.FC = () => {
  const navigate = useNavigate();
  const { userId, pet, refreshPet } = useUser();
  const { getLocation } = useLocation();
  const { manualRain, setManualRain } = useManualRain();

  const [isExercising, setIsExercising] = useState(false);
  const isExercisingRef = useRef(false);

  const [duration, setDuration] = useState(0);
  const durationIntervalRef = useRef<number | null>(null);

  const [steps, setSteps] = useState(0);

  // Wake Lock 相關
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // 螢幕鎖定模式 (防止誤觸)
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const unlockTimerRef = useRef<number | null>(null);
  const [unlockProgress, setUnlockProgress] = useState(0);

  // 開發者模式
  const [devMode, setDevMode] = useState(false);

  // activity state
  const [activity, setActivity] = useState<Activity>("idle");

  // useRef for last magnitude and last step time to avoid stale closure
  const lastMagRef = useRef<number>(0);
  const lastStepTimeRef = useRef<number>(0);

  // handler ref so we can remove listener later
  const motionHandlerRef = useRef<(e: DeviceMotionEvent) => void | null>(null);

  // --- Hard-coded calibration results (from your runs) ---
  // walking: mean mag: 3.35, std:1.21, max:6.45, peaks:22, cadence:2.76Hz
  // jumping: mean mag: 20.85, std:16.24, max:83.68, peaks:18, cadence:2.26Hz
  // Derived recommended thresholds (hard-coded)
  const WALK_CAL = { mean: 2.35, std: 1.21, max: 6.45, peaks: 22, cadence: 1 };
  const JUMP_CAL = { mean: 20.85, std: 16.24, max: 83.68, peaks: 18, cadence: 1.13 };

  // Use recommended thresholds derived from calibration
  const [stepThreshold] = useState<number>(Math.round((WALK_CAL.mean + WALK_CAL.std * 0.25) * 100) / 100); // ~3.65
  const [magPeakThreshold] = useState<number>(Math.round((WALK_CAL.mean + WALK_CAL.std * 0.45) * 100) / 100); // ~3.89
  const [jumpAmpThreshold] = useState<number>(Math.round(JUMP_CAL.max * 0.75)); // ~63
  const [verticalPeakRatioForJump] = useState<number>(0.5);
  const [cadenceWalkingMin] = useState<number>(Math.round((WALK_CAL.cadence - 0.6) * 100) / 100); // ~2.16
  const [cadenceWalkingMax] = useState<number>(Math.round((WALK_CAL.cadence + 0.6) * 100) / 100); // ~3.36

  // min interval for steps
  const minStepInterval = 400; // ms

  // buffer for sliding window (store linear accel mag)
  const samplesRef = useRef<
    Array<{ t: number; lax: number; lay: number; laz: number; mag: number }>
  >([]);

  // gravity estimate for simple high-pass (low-pass for gravity)
  const gravityRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  // feature timer ref so we can clear properly
  const featureTimerRef = useRef<number | null>(null);

  // Pause detection: track idle time
  const idleStartTimeRef = useRef<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef<boolean>(false);

  // Optional debug flag (kept but default off)
  const [DEBUG] = useState<boolean>(false);

  // minimal UI controls: user can mark "outdoor" and "raining" for rewards
  const [isOutdoor, setIsOutdoor] = useState<boolean>(false);
  const [manualRain, setManualRain] = useState<boolean>(() => {
    // Load rain state from localStorage
    const saved = localStorage.getItem("isRaining");
    return saved === "true";
  });

  // automatic weather detection state
  const [isRainingDetected, setIsRainingDetected] = useState<boolean>(false);
  const [weatherChecking, setWeatherChecking] = useState<boolean>(false);

  // bonuses (percent) — keep defaults
  const [morningBonusPercent] = useState<number>(15);
  const [rainyBonusPercent] = useState<number>(10);

  // start time ref to decide morning overlap
  const startTimeRef = useRef<number | null>(null);

  // simple helper: magnitude
  const mag = (ax: number, ay: number, az: number) => Math.sqrt(ax * ax + ay * ay + az * az);

  // Weather detection using open-meteo (no API key). Attempts to get location and checks hourly precipitation.
  const detectWeatherNow = async () => {
    setWeatherChecking(true);

    try {
      const locationData = await getLocation();

      if (!locationData || !locationData.success || !locationData.latitude || !locationData.longitude) {
        setIsRainingDetected(false);
        setWeatherChecking(false);
        toast.error("無法取得位置資訊");
        return;
      }

      const lat = locationData.latitude;
      const lon = locationData.longitude;

      // request hourly precipitation and timezone=auto so times match local
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&current_weather=true&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();

      // find nearest hourly index for now
      const times: string[] = data.hourly?.time ?? [];
      const prec: number[] = data.hourly?.precipitation ?? [];
      if (!times.length || !prec || !prec.length) {
        setIsRainingDetected(false);
        setWeatherChecking(false);
        toast.error("無法取得天氣資料");
        return;
      }

      // find index closest to current local time (hour aligned)
      const now = new Date();
      const nearestIndex = times.reduce((bestIdx: number, t, i) => {
        const dt = Math.abs(new Date(t).getTime() - now.getTime());
        return dt < Math.abs(new Date(times[bestIdx]).getTime() - now.getTime()) ? i : bestIdx;
      }, 0);
      const precipitationNow = prec[nearestIndex] ?? 0;

      // consider raining if precipitation >= 0.5 mm/h
      const raining = precipitationNow >= 0.5;
      setIsRainingDetected(raining);
      setWeatherChecking(false);
      toast.success(`天氣偵測完成：${raining ? "偵測到降雨" : "無降雨"}`);
    } catch (err) {
      console.error(err);
      setIsRainingDetected(false);
      setWeatherChecking(false);
      toast.error("取得天氣資訊失敗");
    }
  };

  // call weather detection automatically when the page/component mounts
  useEffect(() => {
    // run detection once on mount
    detectWeatherNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startExercise = () => {
    // 檢查體力是否足夠
    if (pet && pet.stamina <= 0) {
      toast.error("體力不足！無法開始運動");
      return;
    }

    setIsExercising(true);
    isExercisingRef.current = true;

    setDuration(0);
    setSteps(0);
    lastMagRef.current = 0;
    lastStepTimeRef.current = 0;
    setActivity("idle");
    samplesRef.current = [];
    gravityRef.current = { x: 0, y: 0, z: 0 };
    startTimeRef.current = Date.now();
    idleStartTimeRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;

    toast.success("運動開始！保持節奏~");

    // 開始時間計時器
    if (durationIntervalRef.current) {
      window.clearInterval(durationIntervalRef.current);
    }
    durationIntervalRef.current = window.setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // iOS 需要 requestPermission（必須在 user gesture 才能成功）
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      (DeviceMotionEvent as any)
        .requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            setupMotionDetection();
          } else {
            toast.error("需要動作傳感器權限才能偵測步數");
          }
        })
        .catch((err: any) => {
          console.error("requestPermission error:", err);
          toast.error("無法取得傳感器權限");
        });
    } else {
      // 非 iOS 或舊版直接啟用
      setupMotionDetection();
    }
  };

  // 螢幕鎖定相關函數
  const handleLockScreen = () => {
    setIsScreenLocked(true);
    toast.info("螢幕已鎖定，長按解鎖按鈕 2 秒解鎖");
  };

  const handleUnlockStart = () => {
    if (!isScreenLocked) return;

    let progress = 0;
    unlockTimerRef.current = window.setInterval(() => {
      progress += 5;
      setUnlockProgress(progress);

      if (progress >= 100) {
        if (unlockTimerRef.current) {
          clearInterval(unlockTimerRef.current);
          unlockTimerRef.current = null;
        }
        setIsScreenLocked(false);
        setUnlockProgress(0);
        toast.success("螢幕已解鎖");
      }
    }, 100); // 每 100ms 增加 5%，總共 2 秒
  };

  const handleUnlockEnd = () => {
    if (unlockTimerRef.current) {
      clearInterval(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
    setUnlockProgress(0);
  };

  const stopExercise = () => {
    setIsExercising(false);
    isExercisingRef.current = false;
    setIsScreenLocked(false); // 停止運動時解除鎖定

    // 記錄運動前的力量值
    const strengthBefore = pet?.strength || 0;

    // 清理計時器
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // 清理 feature timer
    if (featureTimerRef.current) {
      clearInterval(featureTimerRef.current);
      featureTimerRef.current = null;
    }

    // 移除動作監聽器
    if (motionHandlerRef.current) {
      window.removeEventListener("devicemotion", motionHandlerRef.current);
      motionHandlerRef.current = null;
    }

    // 重置暫停狀態
    idleStartTimeRef.current = null;
    setIsPaused(false);
    isPausedRef.current = false;

    // 計算獎勵（基本）
    const stamina = Math.floor(duration / 10);
    const mood = Math.floor(duration / 15);

    // 套用早雞加成（若在早上 6-10 點 start 時段）
    let totalMultiplier = 1;
    const startTs = startTimeRef.current ? new Date(startTimeRef.current) : new Date();
    const startHour = startTs.getHours();
    if (startHour >= 6 && startHour < 10) {
      totalMultiplier *= 1 + morningBonusPercent / 100;
    }

    // 判定雨天戶外獎勵（需戶外且自動或手動標示下雨）
    const raining = manualRain || isRainingDetected;
    if (isOutdoor && raining) {
      totalMultiplier *= 1 + rainyBonusPercent / 100;
    }

    // apply multiplier and compute final increments (取整數)
    const finalStamina = Math.floor(stamina * totalMultiplier);
    const finalMood = Math.floor(mood * totalMultiplier);

    // 提交到後端API
    if (userId && duration > 0) {
      logExercise(userId, {
        exercise_type: activity || "unknown",
        duration_seconds: duration,
        volume: steps,
      })
        .then(async (result) => {
          console.log("Exercise result:", result);
          // 計算力量增長 = 運動後力量 - 運動前力量
          const strengthAfter = result.pet?.strength || 0;
          const strengthGained = strengthAfter - strengthBefore;

          // 計算體力消耗：每增加1點力量就減少1點體力
          if (strengthGained > 0 && result.pet) {
            const staminaLoss = strengthGained;
            const newStamina = Math.max(0, result.pet.stamina - staminaLoss);

            // 更新寵物的體力值
            try {
              await updateUserPet(userId, {
                stamina: newStamina
              });

              toast.success(
                `運動完成！偵測到活動: ${activity}。獲得：力量+${strengthGained}${finalMood > 0 ? ` 心情+${finalMood}` : ""} 體力-${staminaLoss}`
              );
            } catch (error) {
              console.error("Failed to update stamina:", error);
              toast.success(
                `運動完成！偵測到活動: ${activity}。獲得：力量+${strengthGained}${finalMood > 0 ? ` 心情+${finalMood}` : ""}`
              );
            }
          } else {
            toast.success(
              `運動完成！偵測到活動: ${activity}。獲得：力量+${strengthGained}${finalMood > 0 ? ` 心情+${finalMood}` : ""}`
            );
          }

          if (result.breakthrough_required) {
            toast.info("恭喜達到突破等級！請前往旅遊完成突破任務");
          }

          // 刷新寵物數據
          await refreshPet();
        })
        .catch((error) => {
          console.error("Failed to log exercise:", error);
          toast.error("提交運動記錄失敗");
        });
    } else {
      toast.success(
        `運動完成！偵測到活動: ${activity}。獲得：心情+${finalMood}`
      );
    }
  };

  // 開發者模式：快速增加力量
  const handleDevModeBoost = async () => {
    if (!userId || !pet) {
      toast.error("請先登入");
      return;
    }

    try {
      const newStrength = pet.strength + 30;
      await updateUserPet(userId, {
        strength: newStrength
      });
      await refreshPet();
      toast.success(`開發者模式：力量 +30！(${pet.strength} → ${newStrength})`);
    } catch (error) {
      console.error("Failed to boost strength:", error);
      toast.error("更新失敗");
    }
  };

  // count peaks naive: a sample is a peak when v > neighbors and > threshold, and respect min interval
  const countPeaks = (
    seq: Array<{ t: number; v: number }>,
    threshold: number,
    minIntervalMs = 250
  ) => {
    let count = 0;
    let lastPeakT = -Infinity;
    for (let i = 1; i < seq.length - 1; i++) {
      const prev = seq[i - 1].v;
      const cur = seq[i].v;
      const next = seq[i + 1].v;
      if (cur > prev && cur > next && cur > threshold && seq[i].t - lastPeakT > minIntervalMs) {
        count++;
        lastPeakT = seq[i].t;
      }
    }
    return count;
  };

  // compute features on sliding window and classify
  const computeFeaturesAndClassify = () => {
    const now = Date.now();
    const windowSize = 2000; // fixed window aligned to hard-coded setup
    const cutoff = now - windowSize;
    const buf = samplesRef.current.filter((s) => s.t >= cutoff);
    samplesRef.current = buf; // save trimmed buffer

    if (buf.length < 4) {
      setActivity("idle");
      // Start tracking idle time
      if (!idleStartTimeRef.current) {
        idleStartTimeRef.current = Date.now();
      } else {
        const idleDuration = (Date.now() - idleStartTimeRef.current) / 1000;
        // Pause timer if idle for more than 10 seconds
        if (idleDuration >= 10 && !isPausedRef.current) {
          setIsPaused(true);
          isPausedRef.current = true;
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          toast.info("偵測到連續10秒無活動，計時器已暫停");
        }
      }
      return;
    }

    const mags = buf.map((s) => s.mag);
    const meanMag = mags.reduce((a, b) => a + b, 0) / mags.length;
    const variance =
      mags.reduce((a, b) => a + (b - meanMag) * (b - meanMag), 0) / Math.max(1, mags.length - 1);
    const stdMag = Math.sqrt(variance);
    const maxMag = Math.max(...mags);

    const peaksMag = countPeaks(buf.map((s) => ({ t: s.t, v: s.mag })), magPeakThreshold, 250);
    const peaksZ = countPeaks(buf.map((s) => ({ t: s.t, v: Math.abs(s.laz) })), magPeakThreshold, 250);

    const windowSec = Math.max(0.001, (buf[buf.length - 1].t - buf[0].t) / 1000);
    const cadenceHz = peaksMag / windowSec;

    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.debug({
        meanMag,
        stdMag,
        maxMag,
        peaksMag,
        peaksZ,
        windowSec,
        cadenceHz,
        stepThreshold,
        magPeakThreshold,
        jumpAmpThreshold,
        cadenceWalkingMin,
        cadenceWalkingMax,
      });
    }

    // classification using hard-coded thresholds
    const isLikelyJump =
      maxMag > jumpAmpThreshold && peaksMag >= 2 && peaksZ / Math.max(1, peaksMag) >= verticalPeakRatioForJump;

    const isLikelyWalk =
      cadenceHz >= cadenceWalkingMin &&
      cadenceHz <= cadenceWalkingMax &&
      stdMag < Math.max(6, WALK_CAL.std * 3) &&
      peaksMag >= 1;

    let detectedActivity: Activity = "unknown";

    if (isLikelyJump) {
      detectedActivity = "jumping";
    } else if (isLikelyWalk) {
      detectedActivity = "walking";
    } else if (maxMag < 0.9 && stdMag < 0.6) {
      detectedActivity = "idle";
    }

    setActivity(detectedActivity);

    // Handle pause/resume based on idle detection
    if (detectedActivity === "idle") {
      if (!idleStartTimeRef.current) {
        idleStartTimeRef.current = Date.now();
      } else {
        const idleDuration = (Date.now() - idleStartTimeRef.current) / 1000;
        // Pause timer if idle for more than 10 seconds
        if (idleDuration >= 10 && !isPausedRef.current) {
          setIsPaused(true);
          isPausedRef.current = true;
          if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
          }
          toast.info("偵測到連續10秒無活動，計時器已暫停");
        }
      }
    } else {
      // Active movement detected - reset idle timer and resume if paused
      idleStartTimeRef.current = null;
      if (isPausedRef.current) {
        setIsPaused(false);
        isPausedRef.current = false;
        if (!durationIntervalRef.current) {
          durationIntervalRef.current = window.setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);
        }
        toast.success("偵測到活動恢復，計時器繼續");
      }
    }
  };

  // setup motion listener and periodic feature compute
  const setupMotionDetection = () => {
    lastMagRef.current = 0;
    lastStepTimeRef.current = 0;
    samplesRef.current = [];
    gravityRef.current = { x: 0, y: 0, z: 0 };

    const alpha = 0.85; // low-pass alpha for gravity estimation

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!isExercisingRef.current) return;

      const a = event.acceleration ?? event.accelerationIncludingGravity;
      if (!a) return;

      const ax = a.x ?? 0;
      const ay = a.y ?? 0;
      const az = a.z ?? 0;

      // update gravity estimate (low-pass)
      gravityRef.current.x = alpha * gravityRef.current.x + (1 - alpha) * ax;
      gravityRef.current.y = alpha * gravityRef.current.y + (1 - alpha) * ay;
      gravityRef.current.z = alpha * gravityRef.current.z + (1 - alpha) * az;

      // linear acceleration = raw - gravity
      const lax = ax - gravityRef.current.x;
      const lay = ay - gravityRef.current.y;
      const laz = az - gravityRef.current.z;

      // magnitude on linear acceleration
      const linearMag = mag(lax, lay, laz);
      const now = Date.now();

      // add to buffer
      samplesRef.current.push({ t: now, lax, lay, laz, mag: linearMag });

      // naive step detection on linear magnitude (still kept)
      const last = lastMagRef.current || linearMag;
      const delta = Math.abs(linearMag - last);
      lastMagRef.current = linearMag;

      if (delta > stepThreshold && now - lastStepTimeRef.current > minStepInterval) {
        setSteps((prev) => prev + 1);
        lastStepTimeRef.current = now;
        if (DEBUG) {
          // eslint-disable-next-line no-console
          console.debug("step detected. delta:", delta, "linearMag:", linearMag);
        }
      }

      // start periodic feature computation timer if not exist
      if (!featureTimerRef.current) {
        featureTimerRef.current = window.setInterval(() => {
          computeFeaturesAndClassify();
        }, 600) as unknown as number;
      }
    };

    motionHandlerRef.current = handleMotion;
    window.addEventListener("devicemotion", handleMotion);
  };

  // ensure cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (featureTimerRef.current) {
        clearInterval(featureTimerRef.current);
      }
      if (motionHandlerRef.current) {
        window.removeEventListener("devicemotion", motionHandlerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-game-bg p-4">
      {/* 鎖定畫面覆蓋層 */}
      {isScreenLocked && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div className="text-center space-y-8 px-6">
            <div className="text-6xl mb-4">🔒</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white">螢幕已鎖定</h2>
              <p className="text-lg text-gray-300">運動進行中...</p>
            </div>

            {/* 運動數據顯示 */}
            <div className="grid grid-cols-2 gap-6 my-8">
              <div className="bg-white/10 rounded-lg p-6 text-center backdrop-blur-sm">
                <div className="text-4xl font-bold text-white">{duration}秒</div>
                <div className="text-sm text-gray-300 mt-2">運動時長</div>
              </div>
              <div className="bg-white/10 rounded-lg p-6 text-center backdrop-blur-sm">
                <div className="text-4xl font-bold text-white">{steps}</div>
                <div className="text-sm text-gray-300 mt-2">步數</div>
              </div>
            </div>

            {/* 解鎖按鈕 */}
            <div className="space-y-4">
              <p className="text-white text-lg">長按下方按鈕 2 秒解鎖</p>
              <button
                onTouchStart={handleUnlockStart}
                onTouchEnd={handleUnlockEnd}
                onMouseDown={handleUnlockStart}
                onMouseUp={handleUnlockEnd}
                onMouseLeave={handleUnlockEnd}
                className="relative w-64 h-20 mx-auto bg-white/20 rounded-full text-white text-xl font-semibold overflow-hidden backdrop-blur-sm active:bg-white/30 transition-colors"
              >
                <div
                  className="absolute left-0 top-0 h-full bg-green-500/50 transition-all duration-100"
                  style={{ width: `${unlockProgress}%` }}
                />
                <span className="relative z-10">
                  {unlockProgress > 0 ? `解鎖中 ${unlockProgress}%` : '按住解鎖'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto space-y-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card className="p-6 space-y-4">
          <h1 className="text-2xl font-bold text-center text-primary">運動模式</h1>

          {/* 開發者模式開關 */}
          <Card className="p-3" style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-grayscale-300)' }}>
            <div className="flex items-center justify-between">
              <Label htmlFor="dev-mode-exercise" className="flex items-center gap-2 tp-body-semibold" style={{ color: 'var(--tp-grayscale-700)' }}>
                <Code className="w-5 h-5" />
                開發者模式
              </Label>
              <Switch
                id="dev-mode-exercise"
                checked={devMode}
                onCheckedChange={setDevMode}
              />
            </div>
            {devMode && (
              <div className="mt-3 space-y-2">
                <p className="tp-caption" style={{ color: 'var(--tp-warning-600)' }}>
                  已啟用開發者模式
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDevModeBoost}
                  disabled={!userId || !pet}
                >
                  +30 力量值
                </Button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">{duration}秒</div>
              <div className="text-sm text-muted-foreground mt-1">運動時長</div>
            </div>

            <div className="bg-muted rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">{steps}</div>
              <div className="text-sm text-muted-foreground mt-1">步數</div>
            </div>
          </div>

          {/* 運動提示 */}
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">運動提示</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 持續運動提升手雞各項數值</li>
              <li>• 搖晃手機即可自動偵測步數</li>
            </ul>
          </div>

          <div className="text-center space-y-2">
            <div className="inline-block px-3 py-1 rounded bg-muted text-sm">
              偵測到活動：{" "}
              <span className="font-semibold">
                {activity === "idle"
                  ? "靜止"
                  : activity === "walking"
                    ? "走路"
                    : activity === "jumping"
                      ? "開合跳"
                      : "未知"}
              </span>
            </div>
            {isPaused && (
              <div className="inline-block px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm font-medium">
                ⏸️ 計時器已暫停（偵測到10秒無活動）
              </div>
            )}
          </div>

          <Button
            size="lg"
            className="w-full h-16 text-lg"
            variant={isExercising ? "destructive" : "default"}
            onClick={isExercising ? stopExercise : startExercise}
          >
            {isExercising ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                結束運動
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                開始運動
              </>
            )}
          </Button>

          {/* 鎖定按鈕 (僅在運動中顯示) */}
          {isExercising && !isScreenLocked && (
            <Button
              size="lg"
              className="w-full"
              variant="outline"
              onClick={handleLockScreen}
            >
              🔒 鎖定螢幕 (防止誤觸)
            </Button>
          )}

          {/* Minimal user-facing controls (compact) */}
          <div className="flex items-center justify-between mt-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isOutdoor}
                onChange={(e) => setIsOutdoor(e.target.checked)}
                className="form-checkbox"
              />
              戶外運動
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={manualRain}
                onChange={(e) => {
                  const isRaining = e.target.checked;
                  setManualRain(isRaining);
                  // Save rain state to localStorage
                  localStorage.setItem("isRaining", isRaining.toString());
                }}
                className="form-checkbox"
              />
              手動：下雨
            </label>
          </div>

          {/* Show the hard-coded calibration summary for transparency */}
          <div className="mt-3 p-3 bg-accent/5 rounded text-xs text-muted-foreground">
            <div className="font-medium">校準（已內建）</div>
            <div>走路 — mean: {WALK_CAL.mean}, std: {WALK_CAL.std}, max: {WALK_CAL.max}, cadence: {WALK_CAL.cadence}Hz</div>
            <div className="mt-1">開合跳 — mean: {JUMP_CAL.mean}, std: {JUMP_CAL.std}, max: {JUMP_CAL.max}, cadence: {JUMP_CAL.cadence}Hz</div>
            <div className="mt-2 text-xs">
              使用已套用參數：stepThreshold={stepThreshold}, magPeakThreshold={magPeakThreshold}, jumpAmpThreshold={jumpAmpThreshold}
            </div>

            <div className="mt-2 text-xs">
              自動天氣偵測：{" "}
              {weatherChecking ? "偵測中..." : isRainingDetected ? "自動：下雨" : "自動：無降雨"}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-accent/10 border-accent">
          <p className="text-sm text-center text-accent-foreground">
            💡 使用手機加速度與定位（需允許）實時偵測您的運動步數與活動類型！（僅支援實機、HTTPS / localhost）
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Exercise;