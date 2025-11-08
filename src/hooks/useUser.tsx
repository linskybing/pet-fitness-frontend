import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { User, Pet, getUserPet } from "@/lib/api";

interface UserContextType {
  userId: string | null;
  setUserId: (id: string | null) => void;
  pet: Pet | null;
  setPet: (pet: Pet | null) => void;
  refreshPet: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => {
    // Load from localStorage
    const saved = localStorage.getItem("userId");
    return saved || null;
  });
  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Save userId to localStorage when it changes
  useEffect(() => {
    if (userId !== null) {
      localStorage.setItem("userId", userId);
    } else {
      localStorage.removeItem("userId");
    }
  }, [userId]);

  // Fetch pet data when userId changes
  const refreshPet = async () => {
    if (!userId) {
      setPet(null);
      return;
    }

    setIsLoading(true);
    try {
      const petData = await getUserPet(userId);
      setPet(petData);
    } catch (error) {
      console.error("Failed to fetch pet:", error);
      // If pet not found, clear userId and redirect to welcome
      if (error instanceof Error && error.message.includes("not found")) {
        console.log("Pet not found, clearing userId");
        setUserId(null);
        setPet(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Polling: periodically refresh pet from backend to keep stats up-to-date.
  // Enabled by default for option 1 behavior. Polling will pause when the
  // document is hidden to save resources and resume (with an immediate
  // refresh) when the page becomes visible again.
  const pollingRef = useRef<number | null>(null);
  const enablePolling = true; // set to false to disable automatic polling
  const pollIntervalMs = 30000; // 30s

  useEffect(() => {
    if (!enablePolling || !userId) return;

    const startPolling = () => {
      // Immediately refresh once
      refreshPet();
      // start interval
      pollingRef.current = window.setInterval(() => {
        refreshPet();
      }, pollIntervalMs) as unknown as number;
    };

    const stopPolling = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // visible again: refresh immediately and restart polling
        startPolling();
      }
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enablePolling, userId, refreshPet]);

  useEffect(() => {
    if (userId) {
      refreshPet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <UserContext.Provider value={{ userId, setUserId, pet, setPet, refreshPet, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
