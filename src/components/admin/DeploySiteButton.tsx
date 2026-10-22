import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { triggerSiteDeploy } from "@/lib/triggerSiteDeploy";

interface DeploySiteButtonProps {
  className?: string;
  source?: string;
  size?: "default" | "sm" | "lg" | "icon";
}

const DeploySiteButton = ({ className, source = "admin", size = "default" }: DeploySiteButtonProps) => {
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const data = await triggerSiteDeploy(source);
      toast({
        title: "Đang rebuild SEO thủ công",
        description: data?.message || "Vercel dang build lai store pages, blog pages va sitemap. Cho vai phut roi check production.",
      });
    } catch (error) {
      toast({
        title: "Khong trigger duoc deploy",
        description: error instanceof Error ? error.message : "Kiem tra DEPLOY_HOOK_URL trong Supabase secrets.",
        variant: "destructive",
      });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <Button onClick={handleDeploy} disabled={deploying} className={className} size={size}>
      {deploying ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Rocket className="mr-2 h-4 w-4" />
      )}
      {deploying ? "Đang rebuild..." : "SEO rebuild dự phòng"}
    </Button>
  );
};

export default DeploySiteButton;
