import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Play, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Exercise = () => {
  const navigate = useNavigate();
  const [isExercising, setIsExercising] = useState(false);
  const [duration, setDuration] = useState(0);
  const [steps, setSteps] = useState(0);
  const [lastAcceleration, setLastAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [stepThreshold] = useState(15); // 摇晃阈值

  const startExercise = () => {
    setIsExercising(true);
    setDuration(0);
    setSteps(0);
    toast.success("運動開始！保持節奏~");

    // 计时器 - 每秒更新运动时长
    const durationInterval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    // 请求加速度传感器权限（iOS 13+需要）
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      (DeviceMotionEvent as any).requestPermission()
        .then((permissionState: string) => {
          if (permissionState === 'granted') {
            setupMotionDetection();
          } else {
            toast.error('需要动作传感器权限才能侦测步数');
          }
        })
        .catch(() => {
          toast.error('无法获取传感器权限');
        });
    } else {
      // 非iOS或旧版浏览器直接启用
      setupMotionDetection();
    }

    // 保存interval ID以便清理
    (window as any).exerciseDurationInterval = durationInterval;
  };

  const setupMotionDetection = () => {
    let lastStepTime = Date.now();
    const minStepInterval = 200; // 最小步数间隔（毫秒），防止重复计数

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!isExercising) return;

      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration || acceleration.x === null || acceleration.y === null || acceleration.z === null) {
        return;
      }

      // 计算加速度变化量（摇晃强度）
      const deltaX = Math.abs(acceleration.x - lastAcceleration.x);
      const deltaY = Math.abs(acceleration.y - lastAcceleration.y);
      const deltaZ = Math.abs(acceleration.z - lastAcceleration.z);

      const totalDelta = deltaX + deltaY + deltaZ;

      // 更新上次加速度值
      setLastAcceleration({
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z
      });

      // 如果摇晃强度超过阈值，且距离上次计步时间足够长，则计为一步
      const now = Date.now();
      if (totalDelta > stepThreshold && now - lastStepTime > minStepInterval) {
        setSteps((prev) => prev + 1);
        lastStepTime = now;
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    (window as any).exerciseMotionHandler = handleMotion;
  };

  const stopExercise = () => {
    setIsExercising(false);

    // 清理计时器
    clearInterval((window as any).exerciseDurationInterval);

    // 移除动作监听器
    if ((window as any).exerciseMotionHandler) {
      window.removeEventListener('devicemotion', (window as any).exerciseMotionHandler);
      (window as any).exerciseMotionHandler = null;
    }

    // 计算奖励
    const stamina = Math.floor(duration / 10);
    const satiety = Math.floor(steps / 20);
    const mood = Math.floor(duration / 15);

    toast.success(`運動完成！獲得：體力+${stamina} 飽食度+${satiety} 心情+${mood}`);
  };

  return (
    <div className="min-h-screen bg-game-bg p-4">
      <div className="max-w-md mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-center text-primary">運動模式</h1>

          <div className="space-y-4">
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

            <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-foreground">運動提示</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 早上6-10點運動有 +15% 加成（早雞）</li>
                <li>• 雨天戶外運動額外獎勵（雨天不退）</li>
                <li>• 持續運動提升手雞各項數值</li>
                <li>• 搖晃手機即可自動侦測步数</li>
              </ul>
            </div>
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
        </Card>

        <Card className="p-4 bg-accent/10 border-accent">
          <p className="text-sm text-center text-accent-foreground">
            💡 使用手机加速度传感器实时侦测您的运动步数！
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Exercise;
