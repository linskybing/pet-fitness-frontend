import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Footprints, MapPin } from "lucide-react";
import { getUserDailyQuests, completeDailyQuestV2 } from "@/lib/api";
import { UserDailyQuest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface DailyQuestsProps {
    userId: string;
    onQuestCompleted?: () => void;
}

const DailyQuests = ({ userId, onQuestCompleted }: DailyQuestsProps) => {
    const [quests, setQuests] = useState<UserDailyQuest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadQuests = useCallback(async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const data = await getUserDailyQuests(userId);
            setQuests(data);
        } catch (error) {
            console.error("Failed to load daily quests:", error);
            toast({
                title: "錯誤",
                description: "載入每日任務失敗",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }, [userId, toast]);

    useEffect(() => {
        loadQuests();
    }, [loadQuests]);

    const handleClaimReward = async (questId: number) => {
        try {
            await completeDailyQuestV2(userId, questId);
            toast({
                title: "任務完成！",
                description: "已領取獎勵",
            });
            await loadQuests();
            onQuestCompleted?.();
        } catch (error) {
            console.error("Failed to claim reward:", error);
            toast({
                title: "錯誤",
                description: "領取獎勵失敗",
                variant: "destructive",
            });
        }
    };

    const getQuestIcon = (type: string) => {
        switch (type) {
            case "exercise":
                return <Clock className="w-5 h-5" />;
            case "steps":
                return <Footprints className="w-5 h-5" />;
            case "location":
                return <MapPin className="w-5 h-5" />;
            default:
                return <Trophy className="w-5 h-5" />;
        }
    };

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="text-center text-muted-foreground">載入中...</div>
            </Card>
        );
    }

    if (quests.length === 0) {
        return (
            <Card className="p-4">
                <div className="text-center text-muted-foreground">今日暫無任務</div>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-xl font-bold text-primary">📋 每日任務</h2>
            {quests.map((userQuest) => {
                const quest = userQuest.quest;
                const progress = (userQuest.current_progress / quest.target_value) * 100;
                const isCompleted = userQuest.is_completed;
                const canClaim = progress >= 100 && !isCompleted;

                return (
                    <Card key={userQuest.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    {getQuestIcon(quest.quest_type)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-foreground">{quest.title}</h3>
                                    <p className="text-sm text-muted-foreground">{quest.description}</p>

                                    {/* 進度條 */}
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                進度: {Math.min(userQuest.current_progress, quest.target_value)}/{quest.target_value}
                                            </span>
                                            <span className="font-medium text-primary">
                                                {Math.min(Math.floor(progress), 100)}%
                                            </span>
                                        </div>
                                        <Progress value={Math.min(progress, 100)} className="h-2" />
                                    </div>

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
                            <div className="ml-2">
                                {isCompleted ? (
                                    <Button disabled variant="outline" size="sm">
                                        已完成
                                    </Button>
                                ) : canClaim ? (
                                    <Button
                                        onClick={() => handleClaimReward(userQuest.id)}
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-600"
                                    >
                                        領取
                                    </Button>
                                ) : (
                                    <Button disabled variant="ghost" size="sm">
                                        進行中
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default DailyQuests;
