import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureException } from "@/lib/analytics";
import { buttonVariants } from "@/components/ui/button";
import { posthogLog } from "@/lib/posthog-logs";
import { cn } from "@/lib/utils";

/**
 * Replaces a crashed screen with a short explanation instead of a blank page.
 * Logs only the error and component stack; never application state or free text.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; standalone?: boolean },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DoRoboty.ai: screen failed to render", error, info.componentStack);
    captureException(error);
    posthogLog.error("screen rendering failed", {
      error_type: error.name,
      boundary: this.props.standalone ? "application" : "route",
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section
        className={cn("prototype-section", this.props.standalone && "mx-auto px-5 lg:px-8")}
        aria-labelledby="error-boundary-title"
      >
        <h1 id="error-boundary-title">Coś poszło nie tak</h1>
        <p className="my-5">
          Tego ekranu nie udało się wyświetlić. Twoje dane w tej przeglądarce nie zostały usunięte.
          Odśwież stronę albo wróć do ofert. Jeśli błąd się powtarza, w ustawieniach danych możesz
          pobrać kopię zapisu lub przywrócić scenariusz.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={buttonVariants()} onClick={() => location.reload()}>
            Odśwież stronę
          </button>
          <a className={buttonVariants({ variant: "outline" })} href="#/oferty">
            Wróć do ofert
          </a>
        </div>
      </section>
    );
  }
}
