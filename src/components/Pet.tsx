import { useEffect, useRef, useState } from "react";
import bg from "@/assets/image/background.png";

interface PetProps {
  stage: "egg" | "small" | "medium" | "large" | "buff";
  mood: number;
  message?: string;
  // when true, allow the 5s show-timer to start; this should be set by the parent
  // when the app has finished entrance/loading and the main page is visible
  startMessageTimer?: boolean;
  // optional stats for on-click messages
  strength?: number;
  strengthMax?: number;
  stamina?: number;
  staminaMax?: number;
}

const Pet = ({ stage, mood, message, startMessageTimer, strength, strengthMax, stamina, staminaMax }: PetProps) => {
  const petRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 150, y: 150 });
  const [velocity, setVelocity] = useState({ x: 1, y: 1 });
  const [containerSize, setContainerSize] = useState({ width: 300, height: 300 });
  const [showMessage, setShowMessage] = useState<boolean>(false);

  // manual (click-triggered) message management
  const manualTimerRef = useRef<number | null>(null);
  const [manualMessage, setManualMessage] = useState<string | undefined>(undefined);
  const [cycleIdx, setCycleIdx] = useState<number>(-1); // -1 means no manual cycle active

  // auto (startup) message (we show mood for 5s when startMessageTimer becomes true)
  const autoTimerRef = useRef<number | null>(null);
  const [autoMessage, setAutoMessage] = useState<string | undefined>(undefined);
  // track whether we've already shown the auto (entrance) message once
  const autoShownRef = useRef<boolean>(false);
  // bubble measurement so we can place its bottom at the top of the pet
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState<number>(0);

  // measure bubble height so we can position it exactly above the pet
  useEffect(() => {
    const measure = () => {
      const el = bubbleRef.current;
      if (el) setBubbleHeight(el.clientHeight);
    };

    if ((manualMessage ?? autoMessage ?? message) && showMessage) {
      // measure on next frame after render
      requestAnimationFrame(measure);
    } else {
      setBubbleHeight(0);
    }
  }, [manualMessage, autoMessage, message, showMessage, position.x, position.y, containerSize.width]);

  

  const petSizes = {
    egg: 40,
    small: 50,
    medium: 65,
    large: 80,
    buff: 95,
  } as const;

  const petSize = petSizes[stage];

  // compute bubble top so its bottom aligns with the pet's top
  const computedBubbleTop = bubbleHeight > 0 ? Math.max(8, position.y - bubbleHeight - 6) : Math.max(8, position.y - petSize * 0.8);

  // measure container and update on resize
  useEffect(() => {
    const updateSize = () => {
      const el = containerRef.current;
      if (el) {
        const w = el.clientWidth;
        const h = el.clientHeight;
        setContainerSize({ width: w, height: h });
        // clamp pet position
        setPosition((prev) => ({
          x: Math.max(0, Math.min(prev.x, w - petSize)),
          y: Math.max(0, Math.min(prev.y, h - petSize)),
        }));
      }
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", updateSize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [petSize]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => {
        let newX = prev.x + velocity.x;
        let newY = prev.y + velocity.y;
        let newVelX = velocity.x;
        let newVelY = velocity.y;

        // Collision detection with measured boundaries
        if (newX <= 0 || newX + petSize >= containerSize.width) {
          newVelX = -newVelX;
          newX = Math.max(0, Math.min(newX, containerSize.width - petSize));
        }

        if (newY <= 0 || newY + petSize >= containerSize.height) {
          newVelY = -newVelY;
          newY = Math.max(0, Math.min(newY, containerSize.height - petSize));
        }

        // occasional random change
        if (Math.random() > 0.98) {
          newVelX = (Math.random() - 0.5) * 2;
          newVelY = (Math.random() - 0.5) * 2;
        }

        // update velocity for next tick
        setVelocity({ x: newVelX, y: newVelY });

        return { x: newX, y: newY };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [velocity, petSize, containerSize]);

  const getPetEmoji = () => {
    switch (stage) {
      case "egg":
        return "🥚";
      case "small":
        return "🐣";
      case "medium":
        return "🐤";
      case "large":
        return "🐥";
      case "buff":
        return "💪🐔";
      default:
        return "🐣";
    }
  };

  // show auto mood message for 5s only once when startMessageTimer becomes true
  // (do not re-trigger after manual messages finish)
  useEffect(() => {
    // if already shown once, do nothing
    if (autoShownRef.current) return;

    // if there's a manual message active, defer until manual completes but still only once
    if (manualMessage) return;

    if (startMessageTimer) {
      // generate mood message and show for 5s
      const msg = genMoodMessage(mood);
      setAutoMessage(msg);
      setShowMessage(true);
      autoShownRef.current = true; // mark as shown so we won't show again

      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
      autoTimerRef.current = window.setTimeout(() => {
        setAutoMessage(undefined);
        setShowMessage(false);
        autoTimerRef.current = null;
      }, 5000);
    }

    return () => {
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
    // only run when startMessageTimer or mood or manualMessage changes
  }, [startMessageTimer, mood, manualMessage]);

  // cleanup manual timer on unmount
  useEffect(() => {
    return () => {
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current);
        manualTimerRef.current = null;
      }
      if (autoTimerRef.current) {
        clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, []);

  // helper message generators
  const genStrengthMessage = (value?: number, max = 120) => {
    if (value == null) return "力量資訊不可用";
    if (value < max / 4) return `力量很低，需要多做基礎訓練並給予休息或營養補充。`;
    if (value < max / 2) return `力量有點不足，持續訓練會有提升喔！`;
    return `力量良好，繼續保持！`;
  };

  const genStaminaMessage = (value?: number, max = 900) => {
    if (value == null) return "體力資訊不可用";
    if (value <= 0) return `咕咕！今天運動量已經足夠了，明天繼續加油！🌟`;
    if (value < max / 4) return `體力很低，先休息並補充能量吧！`;
    if (value < max / 2) return `體力有點不足，建議做溫和運動恢復。`;
    return `體力狀態良好，可以安心運動。`;
  };

  const genMoodMessage = (moodVal?: number) => {
    if (moodVal == null) return "心情資訊不可用";
    if (moodVal <= 40) return `心情較差，可以做些放鬆或聽音樂喔。`;
    if (moodVal <= 60) return `心情還好，咕咕～感覺還不錯呢！`;
    return `咕咕！心情超好，繼續保持運動習慣喔！💪`;
  };

  const handlePetClick = () => {
    // Cycle through: 0 = strength, 1 = stamina, 2 = mood, then back to 0.
    // If a manual timer exists, cancel it and immediately advance to the next stage.
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current);
      manualTimerRef.current = null;
    }

    const next = (cycleIdx + 1) % 3; // if cycleIdx === -1 => ( -1 +1 ) %3 = 0 in JS gives 0? ensure positive
    // normalize for -1 case
    const normalizedNext = cycleIdx === -1 ? 0 : next;

    let msg: string | undefined;
    if (normalizedNext === 0) {
      msg = genStrengthMessage(strength, strengthMax ?? 120);
    } else if (normalizedNext === 1) {
      msg = genStaminaMessage(stamina, staminaMax ?? 900);
    } else {
      msg = genMoodMessage(mood);
    }

    setCycleIdx(normalizedNext);
    setManualMessage(msg);
    setShowMessage(true);

    manualTimerRef.current = window.setTimeout(() => {
      setManualMessage(undefined);
      setShowMessage(false);
      // keep cycleIdx at normalizedNext so next click advances the cycle
      // but if we just showed mood (2), leave cycleIdx as 2 so next click wraps to 0
      manualTimerRef.current = null;
    }, 5000);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl shadow-inner overflow-hidden w-full"
      style={{
        aspectRatio: "1 / 1",
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        ref={petRef}
        className="absolute transition-all duration-200 flex items-center justify-center cursor-pointer"
        onClick={handlePetClick}
        style={{
          width: petSize,
          height: petSize,
          left: position.x,
          top: position.y,
          fontSize: petSize * 0.8,
          filter: mood < 40 ? "grayscale(30%)" : "none",
          transform: `scaleX(${velocity.x > 0 ? 1 : -1})`,
          animation: "bounce 0.5s infinite",
        }}
      >
        {getPetEmoji()}
      </div>

      {/* displayedMessage prefers manualMessage -> autoMessage -> parent message */}
      {((manualMessage ?? autoMessage ?? message) && showMessage) && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: position.x + petSize / 2,
            top: computedBubbleTop,
            transform: "translateX(-50%)",
            maxWidth: 200,
            zIndex: 20,
            transition: "left 0.12s linear, top 0.12s linear",
          }}
        >
              <div style={{ position: "relative" }} ref={bubbleRef}>
                <div
              className="px-3 py-2 rounded-lg"
              style={{
                backgroundColor: "#EDF8FA",
                color: "var(--tp-grayscale-800)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                width: 200,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textAlign: 'center',
                wordBreak: 'break-word'
              }}
            >
              {manualMessage ?? autoMessage ?? message}
            </div>
            <div
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                top: "100%",
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "8px solid #EDF8FA",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Pet;
