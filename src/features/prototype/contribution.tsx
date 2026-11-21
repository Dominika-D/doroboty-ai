import { useState, type Ref } from "react";
import { capture } from "@/lib/analytics";
import { Link } from "react-router";
import { Tooltip } from "@base-ui/react/tooltip";
import { Bell, Info, WandSparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { usePrototype } from "./store";
import {
  contributionFields,
  contributionLabels,
  contributionQuestions,
  contributionDeadline,
  contributionState,
  contributionStateLabels,
  type Application,
  type Contribution,
  type ContributionField,
  type ContributionNotification,
} from "./model";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
export const formatContributionDate = (value: string) => dateFormat.format(new Date(value));

/** Noninteractive fact tag shown in the employer list and record metadata. */
export function ContributionStatus({
  application,
  now,
}: {
  application: Pick<
    Application,
    "contribution" | "contributionRequestedAt" | "contributionAddedAt" | "contributionSeenAt"
  >;
  now?: string;
}) {
  const state = contributionState(application, now);
  return (
    <span className="contribution-status" data-state={state}>
      Wkład własny: {contributionStateLabels[state]}
    </span>
  );
}

/** Four fixed questions. Callers own state, validation and submission. */
export function ContributionFields({
  idPrefix,
  value,
  onChange,
  disabled,
  invalidFields = [],
  firstFieldRef,
}: {
  idPrefix: string;
  value: Contribution;
  onChange: (field: ContributionField, text: string) => void;
  disabled?: boolean;
  invalidFields?: ContributionField[];
  firstFieldRef?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <ol className="contribution-questions ph-no-capture">
      {contributionFields.map((field, index) => (
        <li key={field}>
          <label className="field" htmlFor={`${idPrefix}-${field}`}>
            <span>{contributionQuestions[field]}</span>
          </label>
          <Textarea
            id={`${idPrefix}-${field}`}
            ref={index === 0 ? firstFieldRef : undefined}
            rows={3}
            maxLength={3000}
            disabled={disabled}
            aria-invalid={invalidFields.includes(field) || undefined}
            value={value[field]}
            onChange={(event) => onChange(field, event.target.value)}
          />
        </li>
      ))}
    </ol>
  );
}

/** Plain-text export so a recruiter can forward the card to a technical person. */
export function contributionAsText(
  application: Pick<
    Application,
    "candidateName" | "jobTitle" | "contribution" | "contributionQuestions"
  >,
) {
  const card = application.contribution;
  if (!card) return "";
  return [
    `Wkład własny: ${application.candidateName} (${application.jobTitle})`,
    ...contributionFields.map((field) => `\n${contributionQuestions[field]}\n${card[field]}`),
    ...(application.contributionQuestions?.length
      ? ["\nPytania na rozmowę (AI):", ...application.contributionQuestions.map((q) => `- ${q}`)]
      : []),
  ].join("\n");
}

function Answers({ card }: { card: Contribution }) {
  return (
    <dl className="contribution-answers ph-no-capture">
      {contributionFields.map((field) => (
        <div key={field}>
          <dt>{contributionLabels[field]}</dt>
          <dd>
            {card[field] || <span className="record-caption">Kandydat tego nie opisał.</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Employer view: simulated AI summary and two interview questions first, the candidate's own
 * words behind a disclosure. Candidate view: only their own answers.
 */
export function ContributionView({
  application,
  audience,
}: {
  application: Pick<
    Application,
    "contribution" | "contributionSummary" | "contributionQuestions" | "contributionAddedAt"
  >;
  audience: "candidate" | "employer";
}) {
  const card = application.contribution;
  if (!card) return null;
  const added = application.contributionAddedAt && (
    <p className="record-caption">
      Dodane po wysłaniu aplikacji, na prośbę pracodawcy:{" "}
      <time dateTime={application.contributionAddedAt}>
        {formatContributionDate(application.contributionAddedAt)}
      </time>
    </p>
  );
  if (audience === "candidate")
    return (
      <div className="contribution-card ph-no-capture">
        <Answers card={card} />
        {added}
      </div>
    );
  return (
    <div className="contribution-card ph-no-capture">
      {application.contributionSummary && (
        <section className="contribution-summary" aria-labelledby="contribution-summary-title">
          <h4 id="contribution-summary-title" className="contribution-zone-label">
            <WandSparkles aria-hidden="true" className="size-4" />
            Podsumowanie
          </h4>
          <p>{application.contributionSummary}</p>
        </section>
      )}
      {application.contributionQuestions && application.contributionQuestions.length > 0 && (
        <section aria-labelledby="contribution-questions-title">
          <h4 id="contribution-questions-title" className="contribution-subheading">
            Pytania na rozmowę (AI)
          </h4>
          <ol className="contribution-interview">
            {application.contributionQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
      )}
      <details className="contribution-details">
        <summary>
          Pełne odpowiedzi kandydata
          <Tooltip.Root>
            <Tooltip.Trigger
              render={<span role="button" tabIndex={0} />}
              className="contribution-info"
              aria-label="Skąd pochodzi podsumowanie i pytania"
              onClick={(event) => event.preventDefault()}
            >
              <Info aria-hidden="true" className="size-4" />
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner sideOffset={8}>
                <Tooltip.Popup className="contribution-tooltip">
                  Podsumowanie i pytania przygotowała AI przy wysłaniu odpowiedzi. Decyzję oprzyj na
                  pełnych odpowiedziach.
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        </summary>
        <Answers card={card} />
      </details>
      {added}
    </div>
  );
}

/** Recruiter notifications about contribution requests (answered or missed deadline). */
export function ContributionNotifications({
  notifications,
}: {
  notifications: ContributionNotification[];
}) {
  if (notifications.length === 0) return null;
  return (
    <section
      className="contribution-notifications ph-no-capture"
      aria-labelledby="contribution-notifications"
    >
      <h2 id="contribution-notifications">
        <Bell aria-hidden="true" className="inline size-5" /> Powiadomienia ({notifications.length})
      </h2>
      <ul>
        {notifications.map((n) => (
          <li key={`${n.applicationId}-${n.kind}`} data-kind={n.kind}>
            <Link to={`/app/kandydaci/${n.applicationId}`}>{n.candidateName}</Link>{" "}
            {n.kind === "answered"
              ? "dodał(a) opis wkładu własnego"
              : "nie odpowiedział(a) na prośbę o opis wkładu w terminie"}{" "}
            · {n.jobTitle} ·{" "}
            <time dateTime={n.at} className="record-caption">
              {formatContributionDate(n.at)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Second zone of an employer candidate card (direction B): summary only; interview questions
 * stay in the application detail. Without a card: the request action or its status.
 */
export function ContributionListZone({
  application,
  now,
}: {
  application: Application;
  now: string;
}) {
  const { run } = usePrototype();
  const [message, setMessage] = useState("");
  const state = contributionState(application, now);
  const deadline = contributionDeadline(application);
  return (
    <div className="candidate-card-contribution ph-no-capture" data-state={state}>
      {state === "filled" ? (
        <>
          <span className="contribution-zone-label">
            <WandSparkles aria-hidden="true" className="size-4" />
            Podsumowanie
          </span>
          <p>{application.contributionSummary}</p>
        </>
      ) : (
        <>
          <span className="contribution-zone-label">Wkład własny</span>
          {state === "missing" && (
            <>
              <p>Kandydat nie dodał opisu wkładu.</p>
              {!["hired", "rejected", "withdrawn"].includes(application.stage) && (
                <div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (run({ type: "request_contribution", applicationId: application.id })) {
                        capture("contribution_requested", {
                          application_id: application.id,
                          source: "candidate_list",
                        });
                        setMessage(`Wysłano prośbę do ${application.candidateName}.`);
                      }
                    }}
                  >
                    Poproś o opis wkładu
                  </Button>
                </div>
              )}
            </>
          )}
          {state === "waiting" && deadline && (
            <p>
              Poproszono {formatContributionDate(application.contributionRequestedAt!)}. Czekamy do{" "}
              <strong>
                <time dateTime={deadline}>{formatContributionDate(deadline)}</time>
              </strong>
              .
            </p>
          )}
          {state === "no_response" && deadline && (
            <p>
              Brak odpowiedzi. Termin minął{" "}
              <time dateTime={deadline}>{formatContributionDate(deadline)}</time>.
            </p>
          )}
        </>
      )}
      <p role="status" className="sr-only">
        {message}
      </p>
    </div>
  );
}
