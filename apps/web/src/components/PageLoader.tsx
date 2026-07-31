import { sharedContent } from "@/components/content";
import { Spinner } from "@/components/ui/spinner";

/** The one full-page loading state of the app: it used to be copy-pasted into every screen. */
export const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center" role="status">
    <Spinner />
    <span className="sr-only">{sharedContent.loading}</span>
  </div>
);

/** Same, inside an already-rendered card or section. */
export const InlineLoader = () => (
  <div className="flex justify-center py-6" role="status">
    <Spinner />
    <span className="sr-only">{sharedContent.loading}</span>
  </div>
);
