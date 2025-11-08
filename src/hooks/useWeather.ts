import { useState, useEffect } from 'react';

// 全局天氣狀態
let globalManualRain = false;
const listeners: Set<(value: boolean) => void> = new Set();

const notifyListeners = () => {
    listeners.forEach(listener => listener(globalManualRain));
};

export const useManualRain = () => {
    const [manualRain, setManualRain] = useState(globalManualRain);

    useEffect(() => {
        // 訂閱全局狀態變更
        const listener = (value: boolean) => {
            setManualRain(value);
        };
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }, []);

    const setManualRainGlobal = (value: boolean) => {
        globalManualRain = value;
        notifyListeners();
    };

    return { manualRain, setManualRain: setManualRainGlobal };
};
