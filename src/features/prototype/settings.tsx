import { useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { e8State, type TestSet, type TestVariant } from "./model";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { usePrototype } from "./store";
import { serializeState, MAX_IMPORT_BYTES } from "./storage";
import { PageTitle } from "./shell";

export function downloadText(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SettingsPage() {
  const { state, reset, importState, original, loadScenario } = usePrototype();
  const navigate = useNavigate();
  const [pending, setPending] = useState<"reset" | "import" | "test" | null>(null);
  const [testSet, setTestSet] = useState<TestSet>(state.testSet ?? "1");
  const [testVariant, setTestVariant] = useState<TestVariant>(state.testVariant ?? "A");
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function readFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setError("");
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setError("Plik jest za duży (maksymalnie 2 MB).");
      return;
    }
    try {
      setRaw(await file.text());
      setPending("import");
    } catch {
      setError("Nie udało się odczytać pliku.");
    }
  }
  function confirm() {
    if (pending === "test") {
      loadScenario(e8State(testSet, testVariant));
      setPending(null);
      navigate("/app/kandydaci");
      return;
    }
    if (pending === "reset") {
      reset();
      setMessage("Przywrócono scenariusz początkowy.");
    } else if (importState(raw)) {
      setMessage("Dane zostały zaimportowane.");
    }
    setPending(null);
  }
  return (
    <>
      <PageTitle>Ustawienia prototypu</PageTitle>
      <section className="prototype-panel prototype-form">
        <h2>Dane scenariusza</h2>
        <p>
          Zmiany są zapisane tylko w tej przeglądarce. Wysłanie linku innej osobie nie przenosi
          Twoich danych. Eksport pozwala przekazać scenariusz lub zachować kopię przed resetem.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => downloadText("doroboty-scenariusz.json", serializeState(state))}
          >
            Eksportuj dane
          </Button>
          <Button variant="outline" render={<label />}>
            Importuj dane
            <input
              className="sr-only"
              type="file"
              accept="application/json,.json"
              aria-label="Importuj plik scenariusza"
              onChange={readFile}
            />
          </Button>
          {original !== null && (
            <Button
              variant="outline"
              onClick={() =>
                downloadText("doroboty-zapis-do-odzyskania.txt", original, "text/plain")
              }
            >
              Pobierz poprzedni zapis
            </Button>
          )}
        </div>
        <Button variant="destructive" onClick={() => setPending("reset")}>
          Resetuj scenariusz
        </Button>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
      </section>
      <section className="prototype-panel prototype-form mt-6" aria-labelledby="e8-title">
        <h2 id="e8-title">Test z rekruterami (E8)</h2>
        <p>
          Wczytuje zestaw 10 zgłoszeń na jedną ofertę i wchodzi jako Karolina. Wersja A to panel jak
          dziś, wersja B to panel z kartą wkładu. Wczytanie zastępuje dane w tej przeglądarce.
        </p>
        {state.testSet && (
          <p role="status">
            Wczytany: zestaw {state.testSet}, wersja {state.testVariant}.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Zestaw</span>
            <FormSelect
              ariaLabel="Zestaw zgłoszeń"
              value={testSet}
              options={[
                { value: "1", label: "Zestaw 1 – kontrola dokumentacji" },
                { value: "2", label: "Zestaw 2 – katalog produktów" },
              ]}
              onValueChange={(value) => setTestSet(value as TestSet)}
            />
          </label>
          <label className="field">
            <span>Wersja</span>
            <FormSelect
              ariaLabel="Wersja panelu"
              value={testVariant}
              options={[
                { value: "A", label: "A – panel jak dziś" },
                { value: "B", label: "B – karta wkładu" },
              ]}
              onValueChange={(value) => setTestVariant(value as TestVariant)}
            />
          </label>
        </div>
        <div>
          <Button onClick={() => setPending("test")}>Wczytaj zestaw do testu</Button>
        </div>
      </section>
      <section className="prototype-panel prototype-form mt-6">
        <h2>O prototypie</h2>
        <p>
          Wybór osoby zastępuje logowanie. Propozycje AI, Match Score i podsumowania odtwarzają
          przygotowany scenariusz; nie oceniają kompetencji. Używaj przykładowych danych i CV.
        </p>
      </section>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        title={
          pending === "reset"
            ? "Zresetować scenariusz?"
            : pending === "test"
              ? `Wczytać zestaw ${testSet}, wersja ${testVariant}?`
              : "Zastąpić dane scenariusza?"
        }
        description="Ta operacja zastąpi lokalne zmiany. Możesz najpierw wyeksportować dane."
        label={pending === "reset" ? "Resetuj" : pending === "test" ? "Wczytaj" : "Importuj"}
        pending={false}
        onConfirm={confirm}
      />
    </>
  );
}
export function PrivacyPage() {
  return (
    <section className="prototype-section max-w-4xl">
      <h1>Prywatność prototypu</h1>
      <div className="mt-6 space-y-5">
        <p>
          Ta wersja służy do ćwiczeń i testów interfejsu. Nie wpisuj prawdziwych danych osobowych
          ani poufnych informacji.
        </p>
        <p>
          Profile, aplikacje i ustawienia pozostają w pamięci tej przeglądarki. Aplikacja nie wysyła
          ich do bazy, dostawcy AI ani systemu analitycznego. Plik eksportu zawiera cały lokalny
          scenariusz, w tym notatki.
        </p>
        <p>
          Możesz usunąć zmiany przyciskiem „Resetuj scenariusz” w ustawieniach lub wyczyścić dane
          witryny w przeglądarce. Hosting może prowadzić własne logi dostępu.
        </p>
      </div>
    </section>
  );
}
