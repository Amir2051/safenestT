import { useToast } from "@/components/ui/use-toast";

/**
 * Prototype helper: every action that would normally write to the backend
 * reports honestly that nothing was persisted.
 */
export function useDemoToast() {
  const { toast } = useToast();
  return (action) =>
    toast({
      title: "Demo preview — nothing was saved",
      description: `${action} is disabled in this prototype. No record was created or modified.`,
    });
}