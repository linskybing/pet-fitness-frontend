import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { useTownPassAuth } from "@/hooks/useTownPassAuth";
import { createUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Welcome = () => {
    const navigate = useNavigate();
    const { setUserId } = useUser();
    const { toast } = useToast();
    const [petName, setPetName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [pageLoaded, setPageLoaded] = useState(false);

    // Show that page started loading
    useEffect(() => {
        console.log("Welcome page mounted");
        setPageLoaded(true);

        // Global error handler
        const errorHandler = (event: ErrorEvent) => {
            const stack = event.error?.stack || 'No stack';
            setRenderError(`Error: ${event.message}\n\nStack:\n${stack}`);
            console.error("Global error:", event.error);
            event.preventDefault(); // Prevent default error handling
        };

        const rejectionHandler = (event: PromiseRejectionEvent) => {
            setRenderError(`Promise Rejection: ${event.reason}`);
            console.error("Unhandled promise rejection:", event.reason);
        };

        window.addEventListener('error', errorHandler);
        window.addEventListener('unhandledrejection', rejectionHandler);

        return () => {
            window.removeEventListener('error', errorHandler);
            window.removeEventListener('unhandledrejection', rejectionHandler);
        };
    }, []);

    // Always call hook (React rules)
    const { user: townpassUser, isLoading: isTownPassLoading, requestTownPassUser } = useTownPassAuth({ debug: true });

    // Request TownPass user on component mount
    useEffect(() => {
        requestTownPassUser();
    }, [requestTownPassUser]);

    const handleCreateUser = async () => {
        if (!petName.trim()) {
            toast({
                title: "錯誤",
                description: "請輸入寵物名稱",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const townpassId = townpassUser?.id;

            if (!townpassId) {
                // 如果沒有 TownPass ID，使用預設測試帳號
                const defaultUserId = "test-user-001";
                setUserId(defaultUserId);
                toast({
                    title: "歡迎！",
                    description: `${petName} 歡迎回來！（使用測試帳號）`,
                });
                navigate("/");
            } else {
                // 有 TownPass ID，創建新用戶
                const user = await createUser(petName.trim(), townpassId);
                setUserId(user.id);
                toast({
                    title: "歡迎！",
                    description: `${petName} 誕生了！(已連結 TownPass 帳號)`,
                });
                navigate("/");
            }
        } catch (error) {
            toast({
                title: "錯誤",
                description: "創建用戶失敗，請稍後重試",
                variant: "destructive",
            });
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--tp-primary-50)' }}
        >
            {/* Page Load Status - always visible */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: pageLoaded ? '#4ade80' : '#f87171', color: 'white', padding: '4px', textAlign: 'center', fontSize: '12px', zIndex: 9999 }}>
                {pageLoaded ? '✓ Page Loaded' : '⏳ Loading...'}
            </div>

            <Card
                className="w-full max-w-md p-8 space-y-6"
                style={{ backgroundColor: 'var(--tp-white)', borderColor: 'var(--tp-primary-200)' }}
            >
                <div className="text-center space-y-2">
                    <div className="text-6xl mb-4">🐣</div>
                    <h1 className="tp-h1-bold" style={{ color: 'var(--tp-primary-700)' }}>
                        歡迎來到手雞城市
                    </h1>
                    <p className="tp-body-regular" style={{ color: 'var(--tp-grayscale-600)' }}>
                        給你的寵物取個名字，開始你的健身之旅！
                    </p>
                </div>

                <div className="space-y-4">
                    {/* Render Error Display */}
                    {renderError && (
                        <div className="text-left p-3 rounded-lg" style={{ backgroundColor: 'var(--tp-error-50)', borderColor: 'var(--tp-error-300)', borderWidth: '2px' }}>
                            <p className="tp-body-semibold mb-2" style={{ color: 'var(--tp-error-700)' }}>
                                ❌ Render Error:
                            </p>
                            <pre className="text-xs font-mono whitespace-pre-wrap" style={{ color: 'var(--tp-error-600)' }}>
                                {renderError}
                            </pre>
                        </div>
                    )}

                    {/* Debug Info */}
                    <div className="text-left p-3 rounded-lg" style={{ backgroundColor: 'var(--tp-grayscale-100)', borderColor: 'var(--tp-grayscale-300)', borderWidth: '1px' }}>
                        <p className="tp-body-semibold mb-2" style={{ color: 'var(--tp-grayscale-700)' }}>
                            Debug Info:
                        </p>
                        <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--tp-grayscale-600)' }}>
                            <p>User ID: {townpassUser?.id || 'No user'}</p>
                            <p>User Name: {townpassUser?.name || 'N/A'}</p>
                            <p>Loading: {isTownPassLoading ? 'Yes' : 'No'}</p>
                            <p>flutterObject: {(window as any).flutterObject ? 'Yes ✓' : 'No'}</p>
                            <p>townpass_channel: {(window as any).townpass_message_channel ? 'Yes' : 'No'}</p>
                            <p>TownPass obj: {(window as any).TownPass ? 'Yes' : 'No'}</p>
                            <p>webkit: {(window as any).webkit ? 'Yes' : 'No'}</p>
                            <p>ReactNative: {(window as any).ReactNativeWebView ? 'Yes' : 'No'}</p>
                            <p>Window keys with 'town': {Object.keys(window).filter(k => k.toLowerCase().includes('town')).join(', ') || 'None'}</p>
                            <p>Window keys with 'flutter': {Object.keys(window).filter(k => k.toLowerCase().includes('flutter')).join(', ') || 'None'}</p>
                        </div>
                        <Button
                            onClick={() => {
                                requestTownPassUser();
                            }}
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
                        >
                            重新檢測 TownPass
                        </Button>
                    </div>

                    {/* TownPass Status */}
                    {isTownPassLoading && (
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--tp-primary-50)' }}>
                            <p className="tp-body-regular" style={{ color: 'var(--tp-primary-600)' }}>
                                🔄 正在連接 TownPass...
                            </p>
                        </div>
                    )}
                    {townpassUser && (
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--tp-success-50)', borderColor: 'var(--tp-success-200)', borderWidth: '1px' }}>
                            <p className="tp-body-semibold" style={{ color: 'var(--tp-success-700)' }}>
                                ✓ 已連接 TownPass
                            </p>
                            {townpassUser.name && (
                                <p className="tp-body-small" style={{ color: 'var(--tp-success-600)' }}>
                                    {townpassUser.name}
                                </p>
                            )}
                        </div>
                    )}
                    {!isTownPassLoading && !townpassUser && (
                        <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'var(--tp-warning-50)', borderColor: 'var(--tp-warning-200)', borderWidth: '1px' }}>
                            <p className="tp-body-regular" style={{ color: 'var(--tp-warning-700)' }}>
                                ⚠️ 未偵測到 TownPass，將使用預設帳號
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            className="tp-body-semibold block mb-2"
                            style={{ color: 'var(--tp-grayscale-700)' }}
                        >
                            寵物名稱
                        </label>
                        <Input
                            placeholder="例如：咕咕雞"
                            value={petName}
                            onChange={(e) => setPetName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isLoading) {
                                    handleCreateUser();
                                }
                            }}
                            disabled={isLoading}
                            className="w-full"
                        />
                    </div>

                    <Button
                        onClick={handleCreateUser}
                        disabled={isLoading}
                        className="w-full"
                        style={{
                            backgroundColor: 'var(--tp-primary-600)',
                            color: 'var(--tp-white)',
                        }}
                    >
                        {isLoading ? "處理中..." : (townpassUser ? "開始冒險" : "使用預設帳號進入")}
                    </Button>
                </div>

                <div className="text-center">
                    <p className="tp-caption" style={{ color: 'var(--tp-grayscale-500)' }}>
                        運動讓你的寵物變得更強壯！💪
                    </p>
                </div>
            </Card>
        </div>
    );
};

export default Welcome;
