import { useParams } from "react-router-dom";
import ReviewLandingPage from "@/pages/ReviewLandingPage";
import StoreReviewPage from "@/pages/StoreReviewPage";
import { getReviewLandingPage } from "@/lib/reviewLandingPages";

const ReviewRouterPage = () => {
  const { slug } = useParams<{ slug: string }>();

  if (getReviewLandingPage(slug)) {
    return <ReviewLandingPage />;
  }

  return <StoreReviewPage />;
};

export default ReviewRouterPage;
