import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useIsApprovedProvider() {
  const subscriber = useQuery(api.bookingSubscribers.getMySubscription);
  const isLoading = subscriber === undefined;

  const isApprovedProvider =
    !!subscriber &&
    subscriber.isActive === true &&
    (subscriber.approvalStatus === "APPROVED" ||
      subscriber.approvalStatus === "NOT_REQUIRED" ||
      subscriber.approvalStatus === undefined);

  return {
    isApprovedProvider,
    isLoading,
    subscriber,
  };
}
