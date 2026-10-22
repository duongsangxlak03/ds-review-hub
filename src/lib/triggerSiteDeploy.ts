import { supabase } from "@/integrations/supabase/client";

export const triggerSiteDeploy = async (source = "admin") => {
  const { data, error } = await supabase.functions.invoke("trigger-deploy", {
    body: { source },
  });

  if (error) throw error;
  return data as { ok?: boolean; message?: string; triggered_at?: string };
};

let queuedDeployTimer: number | undefined;
const queuedDeploySources = new Set<string>();

export const queueSiteDeploy = (source = "admin-auto", delayMs = 2500) => {
  if (typeof window === "undefined") return;
  queuedDeploySources.add(source);
  window.clearTimeout(queuedDeployTimer);
  queuedDeployTimer = window.setTimeout(() => {
    const batchSource = Array.from(queuedDeploySources).join(",").slice(0, 240) || "admin-auto";
    queuedDeploySources.clear();
    void triggerSiteDeploy(batchSource).catch((error) => {
      console.warn("Automatic SEO rebuild could not be triggered:", error);
    });
  }, delayMs);
};
