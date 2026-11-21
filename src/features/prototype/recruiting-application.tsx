import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { capture } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationRecord } from "./application-record";
import {
  CONTRIBUTION_RESPONSE_DAYS,
  contributionDeadline,
  contributionNotifications,
  contributionState,
  nextStages,
  showsContribution,
  stageLabels,
  type Application,
} from "./model";
import { usePrototype } from "./store";
import { ContributionView, contributionAsText, formatContributionDate } from "./contribution";

export function RecruitingApplication({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const [note, setNote] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLSpanElement>(null);
  const pendingFocus = useRef(false);
  const company = state.companies.find((item) => item.id === application.companyId);
  const availableStages = nextStages[application.stage];
  const [contributionMessage, setContributionMessage] = useState("");
  const requestRef = useRef<HTMLParagraphElement>(null);
  const pendingRequestFocus = useRef(false);
  const terminal = availableStages.length === 0;
  const now = new Date().toISOString();
  const cardState = contributionState(application, now);
  const deadline = contributionDeadline(application);
  const unseen = contributionNotifications(state, application.companyId, now).some(
    (n) => n.applicationId === application.id,
  );

  // Opening the application marks its contribution notifications as read (once per visit,
  // so a deadline simulated on this page still notifies on the candidate list).
  const markedOnOpen = useRef(false);
  useEffect(() => {
    if (markedOnOpen.current) return;
    markedOnOpen.current = true;
    if (unseen) run({ type: "mark_contribution_seen", applicationId: application.id });
  }, [unseen, application.id, run]);

  // After a stage change, move focus to the new stage so keyboard and screen-reader users keep context.
  useLayoutEffect(() => {
    if (pendingFocus.current) {
      statusRef.current?.focus();
      pendingFocus.current = false;
    }
  }, [application.stage]);

  useLayoutEffect(() => {
    if (pendingRequestFocus.current) {
      requestRef.current?.focus();
      pendingRequestFocus.current = false;
    }
  }, [application.contributionRequestedAt]);

  async function copyContribution() {
    try {
      await navigator.clipboard.writeText(contributionAsText(application));
      setContributionMessage(
        "Skopiowano odpowiedzi i pytania. Możesz je wkleić osobie technicznej.",
      );
    } catch {
      setContributionMessage("Nie udało się skopiować. Zaznacz tekst i skopiuj go ręcznie.");
    }
  }

  const contribution =
    cardState === "filled" ? (
      <>
        <ContributionView application={application} audience="employer" />
        <div className="record-actions">
          <Button variant="outline" onClick={copyContribution}>
            Kopiuj odpowiedzi i pytania
          </Button>
        </div>
        <p role="status" className={contributionMessage ? "contribution-copy-status" : "sr-only"}>
          {contributionMessage}
        </p>
      </>
    ) : (
      <div className="contribution-empty">
        <p>Kandydat nie uzupełnił wkładu własnego.</p>
        {cardState === "missing" && !terminal && (
          <>
            <p className="record-caption">
              Kandydat dostanie prośbę w swojej aplikacji i będzie miał {CONTRIBUTION_RESPONSE_DAYS}{" "}
              dni na odpowiedź. Powiadomimy Cię o odpowiedzi albo jej braku.
            </p>
            <div className="record-actions">
              <Button
                onClick={() => {
                  if (run({ type: "request_contribution", applicationId: application.id })) {
                    capture("contribution_requested", { application_id: application.id });
                    setAnnouncement("Wysłano prośbę o opis wkładu.");
                    pendingRequestFocus.current = true;
                  }
                }}
              >
                Poproś o opis wkładu
              </Button>
            </div>
          </>
        )}
        {cardState === "waiting" && deadline && (
          <>
            <p className="contribution-request-notice" tabIndex={-1} ref={requestRef}>
              Poproszono o opis wkładu. Czekamy na odpowiedź do{" "}
              <time dateTime={deadline}>{formatContributionDate(deadline)}</time>.
            </p>
            <div className="record-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  if (run({ type: "expire_contribution_request", applicationId: application.id }))
                    setAnnouncement("Termin minął. Status: Brak odpowiedzi.");
                }}
              >
                Prototyp: symuluj upływ {CONTRIBUTION_RESPONSE_DAYS} dni
              </Button>
            </div>
          </>
        )}
        {cardState === "no_response" && deadline && (
          <p className="contribution-request-notice" data-state="no_response">
            Brak odpowiedzi. Termin minął{" "}
            <time dateTime={deadline}>{formatContributionDate(deadline)}</time>.
          </p>
        )}
      </div>
    );

  return (
    <>
      <ApplicationRecord
        application={application}
        companyName={company?.name ?? ""}
        audience="employer"
        history={application.events}
        statusRef={statusRef}
        showContribution={showsContribution(state)}
        contribution={showsContribution(state) ? contribution : undefined}
        footer={
          availableStages.length > 0 ? (
            <>
              <p className="record-caption">Notatka zapisze się w historii po zmianie etapu.</p>
              <div className="record-actions">
                {availableStages.map((stage) => (
                  <Button
                    key={stage}
                    variant={stage === "rejected" ? "outline" : "default"}
                    onClick={() => {
                      if (run({ type: "stage", applicationId: application.id, stage, note })) {
                        capture("application_stage_changed", {
                          application_id: application.id,
                          stage,
                        });
                        setNote("");
                        setAnnouncement(`Zapisano etap: ${stageLabels[stage]}.`);
                        pendingFocus.current = true;
                      }
                    }}
                  >
                    {stageLabels[stage]}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <p className="record-caption">
              {stageLabels[application.stage]}. Brak kolejnych działań w tym procesie.
            </p>
          )
        }
      >
        {availableStages.length > 0 ? (
          <>
            <h3>
              <label htmlFor="recruiting-note">Notatka rekrutacyjna</label>
            </h3>
            <p className="record-caption" id="recruiting-note-hint">
              Widoczna tylko pracodawcy w tym scenariuszu.
            </p>
            <Textarea
              id="recruiting-note"
              aria-label="Notatka rekrutacyjna (widoczna pracodawcy)"
              aria-describedby="recruiting-note-hint"
              maxLength={12000}
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Co warto sprawdzić w rozmowie?"
            />
          </>
        ) : null}
      </ApplicationRecord>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
