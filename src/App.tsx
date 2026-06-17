import { ClipboardList, RotateCcw, ScrollText, ShieldAlert, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gameDatabase } from "./data/gameDatabase";
import type {
  CardContextLinkRecord,
  CardRecord,
  DossierRecord,
} from "./domain/types";
import {
  buildCounterfactualLedger,
  chooseOption,
  createInitialGameState,
  getCurrentCard,
  getDesignerReport,
  getForcedOption,
  getOptionAvailability,
  getOptionsForCard,
  getPressureWarnings,
  getRole,
  scoreOutcome,
  type GameState,
} from "./game/engine";
import { clearGame, loadGame, saveGame } from "./game/save";

const defaultRoleId = "role_ferdinand_ii";

const woodcutByPhase: Record<string, string> = {
  phase_prewar_settlement: "woodcut-eagle.svg",
  phase_prague_succession: "woodcut-eagle.svg",
  phase_bohemian_revolt: "woodcut-town.svg",
  phase_palatinate_consolidation: "woodcut-town.svg",
  phase_restitution_overreach: "woodcut-town.svg",
  phase_danish_wallenstein: "woodcut-host.svg",
  phase_swedish_wallenstein_crisis: "woodcut-host.svg",
};

function woodcutFor(phaseId: string) {
  const file = woodcutByPhase[phaseId] ?? "woodcut-town.svg";
  return `${import.meta.env.BASE_URL}assets/${file}`;
}

function useMediaQuery(query: string) {
  const supported =
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  const [matches, setMatches] = useState(
    () => supported && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (!supported) return;
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query, supported]);
  return matches;
}

function App() {
  const [state, setState] = useState<GameState>(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      return createInitialGameState(gameDatabase, defaultRoleId);
    }
    return loadGame(storage) ?? createInitialGameState(gameDatabase, defaultRoleId);
  });
  const [screen, setScreen] = useState<"role-select" | "prelude" | "play">(() => {
    const storage = getBrowserStorage();
    return storage && loadGame(storage) ? "play" : "role-select";
  });
  const [showAftermath, setShowAftermath] = useState(false);
  const [dossier, setDossier] = useState<{
    id: string;
    anchorEl: HTMLElement;
  } | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const designerEnabled = isDesignerMode();

  const isNarrow = useMediaQuery("(max-width: 860px)");
  const role = getRole(gameDatabase, state.roleId);
  const card = getCurrentCard(gameDatabase, state);
  const outcome = state.completed ? scoreOutcome(gameDatabase, state) : null;
  const latestEntry = state.log.at(-1);
  const selectedDossier = dossier
    ? gameDatabase.dossiers.find((item) => item.id === dossier.id)
    : undefined;

  function openDossier(dossierId: string, anchorEl: HTMLElement) {
    setDossier({ id: dossierId, anchorEl });
  }

  function commitChoice(cardId: string, optionId: string) {
    const next = chooseOption(gameDatabase, state, cardId, optionId);
    setState(next);
    setDossier(null);
    const storage = getBrowserStorage();
    if (storage) {
      saveGame(storage, next);
    }
    setShowAftermath(true);
  }

  function restart() {
    const next = createInitialGameState(gameDatabase, defaultRoleId);
    setState(next);
    setScreen("role-select");
    setShowAftermath(false);
    setDossier(null);
    const storage = getBrowserStorage();
    if (storage) {
      clearGame(storage);
    }
  }

  function startRole() {
    const next = createInitialGameState(gameDatabase, defaultRoleId);
    setState(next);
    setScreen("prelude");
    setShowAftermath(false);
    setDossier(null);
    const storage = getBrowserStorage();
    if (storage) {
      clearGame(storage);
    }
  }

  function enterFirstReport() {
    setScreen("play");
    setDossier(null);
  }

  return (
    <main className="app-shell">
      <header className={screen === "play" ? "masthead masthead-compact" : "masthead"}>
        <button className="quiet-button" type="button" onClick={restart}>
          <RotateCcw size={16} />
          New campaign
        </button>
        <img
          className="seal"
          src={`${import.meta.env.BASE_URL}assets/imperial-seal.svg`}
          alt="Imperial chancery seal"
        />
        <p className="eyebrow">A Thirty Years' War Political Simulator</p>
        <h1>Empire in Ashes</h1>
        <p className="dek">
          Survive a collapsing imperial order where every useful decision
          creates another problem.
        </p>
      </header>

      {screen === "role-select" ? (
        <RoleSelect role={role} onStart={startRole} />
      ) : screen === "prelude" ? (
        <FerdinandPrelude role={role} onContinue={enterFirstReport} />
      ) : (
        <section className="desk-grid" aria-label="Political desk">
          <aside className="side-panel">
            <PressurePanel
              state={state}
              delta={showAftermath ? latestEntry?.pressure_delta : undefined}
            />
            {designerEnabled ? (
              <button
                className="quiet-button side-toggle"
                type="button"
                onClick={() => setShowDesigner((current) => !current)}
              >
                <ClipboardList size={16} />
                Designer view
              </button>
            ) : null}
            {designerEnabled && showDesigner ? <DesignerPanel state={state} /> : null}
          </aside>

          <section className="main-panel">
            {isNarrow ? (
              <PressurePanel
                state={state}
                delta={showAftermath ? latestEntry?.pressure_delta : undefined}
                compact
              />
            ) : null}
            {showAftermath && latestEntry ? (
              <AftermathPanel
                entry={latestEntry}
                onContinue={() => setShowAftermath(false)}
              />
            ) : card ? (
              <EventCard
                card={card}
                state={state}
                onChoose={commitChoice}
                onSelectDossier={openDossier}
              />
            ) : (
              <OutcomePanel state={state} outcome={outcome} onRestart={restart} />
            )}
          </section>
        </section>
      )}

      {selectedDossier && dossier ? (
        <DossierPopover
          dossier={selectedDossier}
          anchorEl={dossier.anchorEl}
          onClose={() => setDossier(null)}
        />
      ) : null}
    </main>
  );
}

function FerdinandPrelude({
  role,
  onContinue,
}: {
  role: ReturnType<typeof getRole>;
  onContinue: () => void;
}) {
  return (
    <section className="prelude-screen" aria-label="Ferdinand II's position">
      <article className="prelude-card">
        <img
          className="woodcut-band"
          src={`${import.meta.env.BASE_URL}assets/woodcut-eagle.svg`}
          alt=""
          aria-hidden="true"
        />
        <div className="dispatch-meta">
          <span>Historical position</span>
          <span>Before play begins</span>
        </div>
        <div className="date-ribbon">Before 1617</div>
        <h2>Ferdinand II's Position</h2>
        <p className="office">{role.office}</p>
        <section className="historical-brief prelude-brief">
          <p>
            Ferdinand&apos;s story begins inside the Holy Roman Empire, where
            religious division has been contained through public peace and
            imperial law. The Peace of Augsburg keeps Catholics and Lutherans
            inside one legal order, but it leaves enough ambiguity for both sides
            to claim that the settlement favors them.
          </p>
          <p>
            Three unsettled questions lie under almost every quarrel:
            ecclesiastical territories governed by Protestants, church property
            inside Lutheran lands, and the rights of subjects whose confession
            differs from their ruler&apos;s. The emperor is expected to judge within
            the constitution, not simply command it from above.
          </p>
          <p>
            Ferdinand&apos;s own political schooling comes from his years as
            archduke of Inner Austria, where Catholic restoration advanced by
            narrow readings of old concessions, favored appointments, Jesuit
            personnel, and a reform commission backed by troops. Bohemia is not
            Inner Austria: its estates preserve older claims of election,
            charter, privilege, and consent, and they can treat religious policy
            as a question of sworn liberty.
          </p>
        </section>
        <div className="prelude-ledger" aria-label="What to watch in play">
          <div>
            <strong>What every choice costs</strong>
            <span>Imperial command and Catholic confidence are bought against estate trust, a solvent treasury, and the patience of foreign courts. Each measure moves several at once.</span>
          </div>
          <div>
            <strong>The price of borrowed arms</strong>
            <span>Bavaria, the League, and a Wallenstein win battles the crown cannot — but armies on loan set their own terms, and every visible victory gives Sweden or France a reason to enter.</span>
          </div>
          <div>
            <strong>No safe extreme</strong>
            <span>Rule by force alone and the estates and Europe turn against you; rule by concession alone and Catholic confidence and the dynasty fall away. A reign survives only between the two.</span>
          </div>
        </div>
        <button className="choice-button start-role" type="button" onClick={onContinue}>
          <span>Begin</span>
          Enter the first decision
        </button>
      </article>
    </section>
  );
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  const storage = window.localStorage;
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }
  return storage;
}

function isDesignerMode() {
  if (typeof window === "undefined") {
    return false;
  }
  return new URLSearchParams(window.location.search).get("designer") === "1";
}

function RoleSelect({
  role,
  onStart,
}: {
  role: ReturnType<typeof getRole>;
  onStart: () => void;
}) {
  return (
    <section className="role-select" aria-label="Choose a role">
      <div className="role-card">
        <div className="panel-title">
          <ShieldAlert size={17} />
          Choose your office
        </div>
        <h2>{role.name}</h2>
        <p className="office">{role.office}</p>
        <p>{role.why_playable}</p>
        <div className="role-columns">
          <div className="compact-list">
            <strong>Wants</strong>
            <ul>
              {role.player_wants.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="compact-list">
            <strong>Constraints</strong>
            <ul>
              {role.constraints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="role-columns">
          <div className="compact-list">
            <strong>What victory looks like</strong>
            <ul>
              {role.success_conditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="compact-list">
            <strong>How a reign falls</strong>
            <ul>
              {role.failure_conditions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <button className="choice-button start-role" type="button" onClick={onStart}>
          <span>Begin</span>
          Play Ferdinand II
        </button>
      </div>
    </section>
  );
}

function PressurePanel({
  state,
  delta,
  compact = false,
}: {
  state: GameState;
  delta?: Partial<Record<string, number>>;
  compact?: boolean;
}) {
  const warnings = new Map(
    getPressureWarnings(state.pressures, gameDatabase.pressure_thresholds).map(
      (warning) => [warning.pressure, warning.message],
    ),
  );

  return (
    <section className={compact ? "pressure-panel pressure-panel--compact" : "pressure-panel"}>
      <div className="panel-title">
        <ScrollText size={17} />
        Pressures
      </div>
      {gameDatabase.game_variables.map((variable) => {
        const value = state.pressures[variable.id];
        const danger = variable.high_is_dangerous ? value >= 65 : value < 35;
        const change = delta?.[variable.id] ?? 0;
        const warning = warnings.get(variable.id);
        return (
          <div
            className={`pressure${change ? " changed" : ""}${warning ? " at-risk" : ""}`}
            key={variable.id}
          >
            <div className="pressure-row">
              <span>{variable.name}</span>
              <span className="pressure-amount">
                {change ? (
                  <span
                    className={`pressure-delta show ${change > 0 ? "up" : "down"}`}
                  >
                    {change > 0 ? `+${change}` : change}
                  </span>
                ) : null}
                <b className={danger ? "danger" : ""}>{value}</b>
              </span>
            </div>
            <div className="meter" aria-hidden="true">
              <div
                className={danger ? "meter-fill danger-fill" : "meter-fill"}
                style={{ width: `${value}%` }}
              />
            </div>
            {warning ? (
              <small className="pressure-alarm">⚠ {warning}</small>
            ) : (
              <small>{value >= 50 ? variable.high_label : variable.low_label}</small>
            )}
          </div>
        );
      })}
    </section>
  );
}

function EventCard({
  card,
  state,
  onChoose,
  onSelectDossier,
}: {
  card: CardRecord;
  state: GameState;
  onChoose: (cardId: string, optionId: string) => void;
  onSelectDossier: (dossierId: string, anchorEl: HTMLElement) => void;
}) {
  const options = getOptionsForCard(card, state);
  const forced = getForcedOption(card, state);

  return (
    <article className="event-card">
      <img
        className="woodcut-band"
        src={woodcutFor(card.phase_id)}
        alt=""
        aria-hidden="true"
      />
      <div className="date-ribbon">{card.date_label}</div>
      <h2>{card.title}</h2>
      <section className="historical-brief">
        <LinkedParagraph
          text={card.briefing}
          links={card.context_links}
          onSelectDossier={onSelectDossier}
        />
        <LinkedParagraph
          text={card.situation}
          links={card.context_links}
          onSelectDossier={onSelectDossier}
        />
      </section>

      {forced ? (
        <p className="forced-banner">
          <span>The decision is no longer yours</span>
          {card.forced_course?.note}
        </p>
      ) : null}
      <div className="choices" aria-label="Choices">
        {options.map((option) => {
          const availability = getOptionAvailability(option, state);
          return (
            <button
              className="choice-button"
              disabled={!availability.available}
              key={option.id}
              type="button"
              title={availability.reason}
              onClick={() => onChoose(card.id, option.id)}
            >
              {availability.available ? null : (
                <span>Not credible in this situation</span>
              )}
              {availability.available ? option.label : availability.reason}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function LinkedParagraph({
  text,
  links = [],
  onSelectDossier,
}: {
  text: string;
  links?: CardContextLinkRecord[];
  onSelectDossier: (dossierId: string, anchorEl: HTMLElement) => void;
}) {
  if (links.length === 0) {
    return <p>{text}</p>;
  }

  const activeLinks = [...links].sort((a, b) => b.term.length - a.term.length);
  const parts: Array<string | { link: CardContextLinkRecord; text: string }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const match = activeLinks
      .map((link) => ({
        link,
        index: text.toLowerCase().indexOf(link.term.toLowerCase(), cursor),
      }))
      .filter((item) => item.index >= 0)
      .sort((a, b) => a.index - b.index || b.link.term.length - a.link.term.length)[0];

    if (!match) {
      parts.push(text.slice(cursor));
      break;
    }
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }
    parts.push({
      link: match.link,
      text: text.slice(match.index, match.index + match.link.term.length),
    });
    cursor = match.index + match.link.term.length;
  }

  return (
    <p>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <span key={`${part}-${index}`}>{part}</span>
        ) : (
          <button
            className="context-link"
            key={`${part.link.dossier_id}-${index}`}
            type="button"
            onClick={(event) =>
              onSelectDossier(part.link.dossier_id, event.currentTarget)
            }
          >
            {part.text}
          </button>
        ),
      )}
    </p>
  );
}

function DossierPopover({
  dossier,
  anchorEl,
  onClose,
}: {
  dossier: DossierRecord;
  anchorEl: HTMLElement;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: "above" | "below";
  } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const a = anchorEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 12;
      const gap = 8;
      const width = Math.min(360, vw - margin * 2);
      const panelH = panelRef.current?.offsetHeight ?? 280;
      const spaceBelow = vh - a.bottom - gap - margin;
      const spaceAbove = a.top - gap - margin;
      const below = spaceBelow >= Math.min(panelH, 220) || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(160, below ? spaceBelow : spaceAbove);
      const top = below
        ? a.bottom + gap
        : Math.max(margin, a.top - gap - Math.min(panelH, maxHeight));
      const left = Math.min(Math.max(margin, a.left), vw - width - margin);
      setPos({ top, left, width, maxHeight, placement: below ? "below" : "above" });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorEl]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dossier-overlay" onClick={onClose}>
      <aside
        ref={panelRef}
        className={`dossier-popover dossier-popover--${pos?.placement ?? "below"}`}
        role="dialog"
        aria-label="Dossier"
        onClick={(event) => event.stopPropagation()}
        style={
          pos
            ? {
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }
            : { visibility: "hidden" }
        }
      >
        <button
          className="dossier-close"
          type="button"
          onClick={onClose}
          aria-label="Close dossier"
        >
          <X size={14} />
        </button>
        <div className="panel-title">Dossier</div>
        <h3>{dossier.title}</h3>
        <p className="dossier-type">{dossier.dossier_type}</p>
        <p>{dossier.summary}</p>
        <strong>Why it matters</strong>
        <p>{dossier.why_it_matters}</p>
      </aside>
    </div>
  );
}

function DesignerPanel({ state }: { state: GameState }) {
  const report = getDesignerReport(gameDatabase, state);

  return (
    <section className="designer-panel" aria-label="Designer docket">
      <div className="panel-title">
        <ClipboardList size={16} />
        Designer docket
      </div>
      <DesignerLine label="Current dispatch" value={report.current_card_id ?? "none"} />
      <DesignerLine
        label="Remaining dispatches"
        value={`${report.remaining_cards.length}`}
      />
      <div className="designer-scroll">
        {report.remaining_cards.slice(0, 12).map((card) => (
          <article key={card.card_id}>
            <b>{card.card_id}</b>
            <span>
              {card.date_label} - {card.title}
            </span>
          </article>
        ))}
      </div>
      <div className="designer-group">
        <strong>Current courses</strong>
        {report.current_options.map((option) => (
          <p key={option.option_id}>
            <b>{option.available ? "open" : "locked"}</b> {option.option_id}
            {option.reason ? ` - ${option.reason}` : ""}
          </p>
        ))}
      </div>
      <div className="designer-group">
        <strong>Active thresholds</strong>
        {report.active_thresholds.map((threshold) => (
          <p key={threshold.threshold_id}>
            <b>{threshold.kind}</b> {threshold.label}
          </p>
        ))}
        {report.active_thresholds.length === 0 ? <p>None at this point.</p> : null}
      </div>
      <div className="designer-group">
        <strong>Skipped or gated</strong>
        {report.skipped_cards.slice(0, 8).map((card) => (
          <p key={card.card_id}>
            <b>{card.card_id}</b> - {card.reasons.join("; ")}
          </p>
        ))}
        {report.skipped_cards.length === 0 ? <p>None at this point.</p> : null}
      </div>
      <div className="designer-group">
        <strong>Memory tags</strong>
        <p>{report.memory_tags.length ? report.memory_tags.join(", ") : "none"}</p>
      </div>
    </section>
  );
}

function DesignerLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="designer-line">
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
  );
}

function AftermathPanel({
  entry,
  onContinue,
}: {
  entry: GameState["log"][number];
  onContinue: () => void;
}) {
  const deltas = Object.entries(entry.pressure_delta ?? {})
    .filter(([, value]) => value)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .map(([key, value]) => {
      const variable = gameDatabase.game_variables.find((item) => item.id === key);
      const rising = (value as number) > 0;
      // A shift "helps" Ferdinand when a good pressure rises or a dangerous one falls.
      const beneficial = variable?.high_is_dangerous ? !rising : rising;
      return { key, name: variable?.name ?? key, value: value as number, beneficial };
    });

  return (
    <section className="aftermath-panel" aria-label="Aftermath">
      <div className="panel-title">Aftermath</div>
      <strong>{entry.choice}</strong>
      <p>{entry.aftermath ?? entry.consequence}</p>
      {deltas.length ? (
        <div className="aftermath-deltas" aria-label="Pressure shifts">
          {deltas.map((delta) => (
            <span
              className={delta.beneficial ? "delta-chip up" : "delta-chip down"}
              key={delta.key}
            >
              {delta.name} {delta.value > 0 ? `+${delta.value}` : delta.value}
            </span>
          ))}
        </div>
      ) : null}
      {entry.deferred_notes?.map((note) => (
        <p className="deferred-line" key={note}>
          {note}
        </p>
      ))}
      {entry.docket_changes?.map((change) => (
        <p
          className={change.kind === "added" ? "fork-line opens" : "fork-line closes"}
          key={`${change.kind}-${change.date_label}-${change.title}`}
        >
          {change.kind === "added"
            ? `A door opens — ${change.date_label}, ${change.title} now enters the record.`
            : `A door closes — ${change.date_label}, ${change.title} will not come forward in the same form.`}
        </p>
      ))}
      <button className="choice-button continue-button" type="button" onClick={onContinue}>
        <span>Continue</span>
        Proceed to the next decision
      </button>
    </section>
  );
}

function OutcomePanel({
  state,
  outcome,
  onRestart,
}: {
  state: GameState;
  outcome: ReturnType<typeof scoreOutcome> | null;
  onRestart: () => void;
}) {
  const failed = Boolean(outcome?.failure);
  const endDate = state.log.at(-1)?.date_label ?? "1637";

  return (
    <article className="event-card outcome-card">
      <div className="dispatch-meta">
        <span>{failed ? "The reign breaks off" : "Memorial of the reign"}</span>
        <span>{failed ? `As of ${endDate}` : "Filed after Vienna, 1637"}</span>
      </div>
      <div className="date-ribbon">{failed ? endDate : "1637 assessment"}</div>
      <h2>{outcome?.title ?? "Campaign Complete"}</h2>
      <p className="situation">{outcome?.legacy}</p>
      <p className="situation">{outcome?.inheritance}</p>
      <p className="situation">{outcome?.comparison}</p>
      {outcome?.path_signals.length ? (
        <div className="outcome-path">
          <h3>Marks on the record</h3>
          <ul>
            {outcome.path_signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <CounterfactualLedger state={state} />
      <p className="situation">
        {failed
          ? `The reign breaks off after ${state.log.length} ${
              state.log.length === 1 ? "decision" : "decisions"
            }, far short of its close.`
          : `The reign closes with ${state.log.length} recorded acts in the docket.`}
      </p>
      <div className="outcome-columns">
        <div>
          <h3>Strengths</h3>
          <OutcomeList items={outcome?.strengths ?? []} fallback="None secure" />
        </div>
        <div>
          <h3>Dangers</h3>
          <OutcomeList items={outcome?.dangers ?? []} fallback="None severe" />
        </div>
      </div>
      <button className="choice-button restart-choice" type="button" onClick={onRestart}>
        <span>Return</span>
        Begin again from Augsburg
      </button>
    </article>
  );
}

function CounterfactualLedger({ state }: { state: GameState }) {
  const ledger = buildCounterfactualLedger(gameDatabase, state);
  if (ledger.length === 0) {
    return null;
  }
  const divergences = ledger.filter((row) => row.diverged).length;

  return (
    <section className="outcome-path" aria-label="The road taken against the record">
      <h3>The road taken against the record</h3>
      <p className="situation">
        {divergences === 0
          ? "At every recorded fork, the reign held to the course history attests."
          : `At ${divergences} ${divergences === 1 ? "turn" : "turns"}, the reign departed from the course history attests — proof that it could have run otherwise.`}
      </p>
      <div className="outcome-ledger">
        {ledger.map((row) => (
          <div
            className={row.diverged ? "ledger-row diverged" : "ledger-row"}
            key={`${row.date_label}-${row.title}`}
          >
            <div className="ledger-head">
              <span>
                {row.date_label} — {row.title}
              </span>
              <span>
                {row.historical_label
                  ? row.diverged
                    ? "Departed from the record"
                    : "As it happened"
                  : "No recorded course"}
              </span>
            </div>
            <div className="ledger-cols">
              <div className={row.diverged ? "ledger-col" : "ledger-col kept"}>
                <strong>The course taken</strong>
                <span>{row.chosen_label}</span>
              </div>
              <div className="ledger-col">
                <strong>What history records</strong>
                <span>
                  {row.historical_label
                    ? row.diverged
                      ? row.historical_label
                      : "The same course."
                    : "The field was open; no single course was forced."}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OutcomeList({ items, fallback }: { items: string[]; fallback: string }) {
  if (items.length === 0) {
    return <p>{fallback}</p>;
  }
  return (
    <ul>
      {items.map((key) => {
        const variable = gameDatabase.game_variables.find((item) => item.id === key);
        return <li key={key}>{variable?.name ?? key}</li>;
      })}
    </ul>
  );
}

export default App;
