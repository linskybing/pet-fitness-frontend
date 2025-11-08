import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Clock, Footprints, Calendar, TrendingUp } from "lucide-react";
import { getExerciseStats, ExerciseStats as ExerciseStatsType } from "@/lib/api";

interface ExerciseStatsProps {
    userId: string;
}

const ExerciseStatsDisplay = ({ userId }: ExerciseStatsProps) => {
    const [stats, setStats] = useState<ExerciseStatsType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadStats = async () => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const data = await getExerciseStats(userId);
            setStats(data);
        } catch (error) {
            console.error("Failed to load exercise stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // 每30秒刷新一次
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}小時${minutes}分鐘`;
        }
        return `${minutes}分鐘`;
    };

    if (isLoading || !stats) {
        return (
            <Card className="p-4">
                <div className="text-center text-muted-foreground">載入中...</div>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                運動統計
            </h2>

            <div className="grid grid-cols-2 gap-3">
                {/* 今日統計 */}
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">今日運動</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                        {formatTime(stats.today_exercise_time)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-blue-700">
                        <Footprints className="w-3 h-3" />
                        <span>{stats.today_steps.toLocaleString()} 步</span>
                    </div>
                </Card>

                {/* 本週統計 */}
                <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">本週運動</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        {formatTime(stats.this_week_exercise_time)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-sm text-green-700">
                        <Footprints className="w-3 h-3" />
                        <span>{stats.this_week_steps.toLocaleString()} 步</span>
                    </div>
                </Card>
            </div>

            {/* 累計統計 */}
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-purple-900 mb-1">累計運動時間</div>
                        <div className="text-3xl font-bold text-purple-600">
                            {formatTime(stats.total_exercise_time)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-medium text-purple-900 mb-1">累計步數</div>
                        <div className="text-3xl font-bold text-purple-600">
                            {stats.total_steps.toLocaleString()}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ExerciseStatsDisplay;
