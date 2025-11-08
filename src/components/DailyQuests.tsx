import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { getUserDailyQuests, claimDailyQuest } from "@/lib/api";
import { toast } from "sonner";

interface DailyQuestsProps {
    userId: string;
    onQuestCompleted?: () => void;
}

// Hard-coded 每日任務
const DAILY_QUESTS = [
    {
        id: 1,
        title: "每日登錄",
        description: "登錄遊戲即可完成",
        reward_strength: 5,
        reward_stamina: 5,
        reward_mood: 5,
    },
    {
        id: 2,
        title: "運動達人",
        description: "累計運動 10 分鐘",
        reward_strength: 10,
        reward_stamina: 0,
        reward_mood: 5,
    },
    {
        id: 3,
        title: "步行挑戰",
        description: "累計步行 5000 步",
        reward_strength: 10,
        reward_stamina: 0,
        reward_mood: 5,
    },
];

const DailyQuests = ({ userId, onQuestCompleted }: DailyQuestsProps) => {
    const [completedQuests, setCompletedQuests] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [claiming, setClaiming] = useState<number | null>(null);

    const loadQuests = async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const data = await getUserDailyQuests(userId);
            console.log('DailyQuests - API response:', data);

            // 後端返回格式: { quest_1_completed, quest_2_completed, quest_3_completed }
            const completed = new Set<number>();
            if (data.quest_1_completed) completed.add(1);
            if (data.quest_2_completed) completed.add(2);
            if (data.quest_3_completed) completed.add(3);

            console.log('DailyQuests - Completed quest IDs:', Array.from(completed));
            setCompletedQuests(completed);
        } catch (error) {
            console.error("Failed to load daily quests:", error);
            toast.error("載入每日任務失敗");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadQuests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const handleClaimReward = async (questId: number) => {
        if (claiming !== null) return; // 防止重複點擊

        setClaiming(questId);
        try {
            const result = await claimDailyQuest(userId, questId);
            if (result.success) {
                const rewards = result.rewards;
                toast.success(`任務完成！獲得獎勵：💪 +${rewards?.strength || 0}, ⚡ +${rewards?.stamina || 0}, 😊 +${rewards?.mood || 0}`);

                // 領取成功後,從完成列表中移除(後端已經將狀態改為false防止重複領取)
                setCompletedQuests(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(questId);
                    return newSet;
                });

                onQuestCompleted?.();
            } else {
                toast.error(result.message || "領取獎勵失敗");
            }
        } catch (error) {
            console.error("Failed to claim reward:", error);
            const errorMessage = error instanceof Error ? error.message : "領取獎勵失敗";
            toast.error(errorMessage);
        } finally {
            setClaiming(null);
        }
    };

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="text-center text-muted-foreground">載入中...</div>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                每日任務
            </h2>
            {DAILY_QUESTS.map((quest) => {
                const isCompleted = completedQuests.has(quest.id);
                console.log(`Quest ${quest.id} (${quest.title}):`, isCompleted ? 'COMPLETED' : 'NOT completed');

                return (
                    <Card key={quest.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1">
                                {isCompleted ? (
                                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                                ) : (
                                    <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                                )}

                                <div className="flex-1">
                                    <h3 className="font-semibold text-foreground">{quest.title}</h3>
                                    <p className="text-sm text-muted-foreground">{quest.description}</p>

                                    {/* 獎勵 */}
                                    <div className="mt-2 flex gap-2 text-xs">
                                        {quest.reward_strength > 0 && (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                                                💪 +{quest.reward_strength}
                                            </span>
                                        )}
                                        {quest.reward_stamina > 0 && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                                ⚡ +{quest.reward_stamina}
                                            </span>
                                        )}
                                        {quest.reward_mood > 0 && (
                                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                                😊 +{quest.reward_mood}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 領取按鈕 */}
                            {!isCompleted && (
                                <Button
                                    onClick={() => handleClaimReward(quest.id)}
                                    size="sm"
                                    disabled={claiming === quest.id}
                                    className="bg-green-500 hover:bg-green-600"
                                >
                                    {claiming === quest.id ? "領取中..." : "領取"}
                                </Button>
                            )}
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default DailyQuests;
