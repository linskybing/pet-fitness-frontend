import { Progress } from "@/components/ui/progress";

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  icon: string;
  iconType?: 'emoji' | 'svg';
}

const StatBar = ({ label, value, max, icon, iconType = 'emoji' }: StatBarProps) => {
  const percentage = (value / max) * 100;
  
  const getStatColor = () => {
    if (percentage > 70) return "stat-good";
    if (percentage > 40) return "stat-medium";
    return "stat-low";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-foreground">
          {iconType === 'svg' ? (
            <img src={icon} alt="" className="w-4 h-4" />
          ) : (
            <span>{icon}</span>
          )}
          <span className="font-medium">{label}</span>
        </span>
        <span className="text-muted-foreground">
          {value}/{max}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
};

export default StatBar;
