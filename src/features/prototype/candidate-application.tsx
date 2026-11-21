import { useLayoutEffect, useRef, useState } from "react";
import { capture } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { ApplicationRecord } from "./application-record";
import {
  contributionFields,
  emptyContribution,
  contributionDeadline,
  contributionState,
  type Application,
  type Contribution,
  type ContributionField,
} from "./model";
import { usePrototype } from "./store";
import { ContributionFields, ContributionView, formatContributionDate } from "./contribution";

export function CandidateApplication({ application }: { application: Application }) {
  const { state, run } = usePrototype();
  const [confirming, setConfirming] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const focusAfter = useRef<"status" | "trigger" | "confirm" | null>(null);
  const company = state.companies.find((item) => item.id === application.companyId);
  const terminal = ["withdrawn", "rejected", "hired"].includes(application.stage);
  const [card, setCard] = useState<Contribution>(
    state.people.find((x) => x.id === application.candidateId)?.contribution ?? emptyContribution,
  );
  const [cardInvalid, setCardInvalid] = useState<ContributionField[]>([]);
  const cardFirstField = useRef<HTMLTextAreaElement>(null);

  function sendContribution() {
    const missing = contributionFields.filter((field) => card[field].trim().length === 0);
    setCardInvalid(missing);
    if (missing.length > 0) {
      document.getElementById(`contribution-request-${missing[0]}`)?.focus();
      return;
    }
    if (run({ type: "add_contribution", applicationId: application.id, contribution: card })) {
      capture("contribution_submitted", { application_id: application.id });
      setCardInvalid([]);
      setAnnouncement("Opis wkładu został wysłany pracodawcy.");
    }
  }

  const now = new Date().toISOString();
  const cardState = contributionState(application, now);
  const deadline = contributionDeadline(application);
  const contribution =
    cardState === "filled" ? (
      <ContributionView application={application} audience="candidate" />
    ) : cardState === "waiting" && deadline && !terminal ? (
      <div className="contribution-request">
        <p className="contribution-request-notice">
          Pracodawca prosi o opis Twojego wkładu własnego. Masz czas do{" "}
          <time dateTime={deadline}>{formatContributionDate(deadline)}</time>. Odpowiedz na 4
          pytania o jednym projekcie z AI. Odpowiedzi zapiszemy też w Twoim profilu.
        </p>
        <ContributionFields
          idPrefix="contribution-request"
          value={card}
          invalidFields={cardInvalid}
          firstFieldRef={cardFirstField}
          onChange={(field, text) => setCard((current) => ({ ...current, [field]: text }))}
        />
        {cardInvalid.length > 0 && (
          <p className="error-message" role="alert">
            Odpowiedz na wszystkie 4 pytania.
          </p>
        )}
        <div className="record-actions">
          <Button onClick={sendContribution}>Wyślij opis wkładu</Button>
        </div>
      </div>
    ) : cardState === "no_response" && deadline ? (
      <p className="record-caption">
        Termin na opis wkładu minął{" "}
        <time dateTime={deadline}>{formatContributionDate(deadline)}</time>.
      </p>
    ) : (
      <p className="record-caption">Do tej aplikacji nie dodano wkładu własnego.</p>
    );

  useLayoutEffect(() => {
    const targets = { status: statusRef, trigger: triggerRef, confirm: confirmRef };
    if (focusAfter.current) targets[focusAfter.current].current?.focus();
    focusAfter.current = null;
  }, [confirming, application.stage]);

  return (
    <>
      <ApplicationRecord
        application={application}
        companyName={company?.name ?? ""}
        audience="candidate"
        history={application.events.map(({ stage, at }) => ({ stage, at }))}
        statusRef={statusRef}
        contribution={contribution}
        footer={
          terminal ? (
            <p className="record-caption">
              {application.stage === "withdrawn"
                ? "Aplikacja została wycofana."
                : "Proces rekrutacyjny został zakończony."}
            </p>
          ) : confirming ? (
            <div className="record-withdrawal">
              <p>Czy na pewno chcesz wycofać aplikację?</p>
              <div className="record-actions">
                <Button
                  ref={confirmRef}
                  variant="destructive"
                  onClick={() => {
                    if (run({ type: "withdraw", applicationId: application.id })) {
                      capture("application_withdrawn", {
                        application_id: application.id,
                      });
                      focusAfter.current = "status";
                      setConfirming(false);
                      setAnnouncement("Aplikacja została wycofana.");
                    }
                  }}
                >
                  Potwierdź wycofanie
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    focusAfter.current = "trigger";
                    setConfirming(false);
                  }}
                >
                  Anuluj
                </Button>
              </div>
            </div>
          ) : (
            <div className="record-withdrawal">
              <p className="record-caption">
                To kopia aplikacji z momentu wysłania. Późniejsze zmiany profilu jej nie zmieniają.
              </p>
              <div className="record-actions">
                <Button
                  ref={triggerRef}
                  variant="outline"
                  onClick={() => {
                    focusAfter.current = "confirm";
                    setConfirming(true);
                  }}
                >
                  Wycofaj aplikację
                </Button>
              </div>
            </div>
          )
        }
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
