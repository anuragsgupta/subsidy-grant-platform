import { Button } from "@/components/ui/button";

export function ApplicationWorkflowActions() {
  return (
    <div className="flex items-center gap-3">
      <Button disabled title="Coming soon" variant="default">
        Approve
      </Button>
      <Button disabled title="Coming soon" variant="destructive">
        Reject
      </Button>
      <Button disabled title="Coming soon" variant="outline">
        Request Clarification
      </Button>
    </div>
  );
}
