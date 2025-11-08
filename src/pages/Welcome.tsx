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

    // TownPass authentication
    const { requestTownPassUser, user: townpassUser, isLoading: isTownPassLoading } = useTownPassAuth({
        debug: true
    });

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
                // 如果沒有 TownPass ID，直接使用 userId = 1
                setUserId(1);
                toast({
                    title: "歡迎！",
                    description: `${petName} 歡迎回來！（使用預設帳號）`,
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
