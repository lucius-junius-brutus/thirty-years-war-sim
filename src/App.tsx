import { ClipboardList, RotateCcw, ScrollText, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { gameDatabase } from "./data/gameDatabase";
import type {
  CardContextLinkRecord,
  CardRecord,
  DossierRecord,
} from "./domain/types";
import {
  chooseOption,
  createInitialGameState,
  getCurrentCard,
  getDesignerReport,
  getOptionAvailability,
  getOptionsForCard,
  getRole,
  scoreOutcome,
  type GameState,
} from "./game/engine";
import { clearGame, loadGame, saveGame } from "./game/save";

const defaultRoleId = "role_ferdinand_ii";

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
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(null);
  const [showDesigner, setShowDesigner] = useState(false);
  const designerEnabled = isDesignerMode();

  const role = getRole(gameDatabase, state.roleId);
  const card = getCurrentCard(gameDatabase, state);
  const outcome = state.completed ? scoreOutcome(gameDatabase, state) : null;
  const latestEntry = state.log.at(-1);
  const selectedDossier = gameDatabase.dossiers.find(
    (dossier) => dossier.id === selectedDossierId,
  );

  function commitChoice(cardId: string, optionId: string) {
    const next = chooseOption(gameDatabase, state, cardId, optionId);
    setState(next);
    setSelectedDossierId(null);
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
    setSelectedDossierId(null);
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
    setSelectedDossierId(null);
    const storage = getBrowserStorage();
    if (storage) {
      clearGame(storage);
    }
  }

  function enterFirstReport() {
    setScreen("play");
    setSelectedDossierId(null);
  }

  return (
    <main className="app-shell">
      <header className="masthead">
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
            <PressurePanel state={state} />
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
            {selectedDossier ? <DossierPanel dossier={selectedDossier} /> : null}
          </aside>

          <section className="main-panel">
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
                onSelectDossier={setSelectedDossierId}
              />
            ) : (
              <OutcomePanel state={state} outcome={outcome} onRestart={restart} />
            )}
          </section>
        </section>
      )}
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
    <section className="prelude-screen" aria-label="Ferdinand's inheritance">
      <article className="prelude-card">
        <div className="dispatch-meta">
          <span>Opening papers</span>
          <span>Before the first report</span>
        </div>
        <div className="date-ribbon">Before 1617</div>
        <h2>Ferdinand's Inheritance</h2>
        <p className="office">{role.office}</p>
        <section className="historical-brief prelude-brief">
          <p>
            Ferdinand enters these papers as archduke of Inner Austria, heir to a
            hard Catholic restoration in his own lands and claimant to crowns
            whose estates still speak in the language of privilege, confession,
            and sworn liberties.
          </p>
          <p>
            The Holy Roman Empire is not a single kingdom waiting for command. It
            is a legal order of electors, princes, cities, circles, courts, and
            estates, held together by the public peace and by habits of
            consultation that war can break faster than law can mend.
          </p>
          <p>
            In Bohemia, Hungary, and the hereditary lands, dynastic security,
            Catholic recovery, estate privilege, imperial legality, money, and
            armed help already press against one another. Each report asks which
            danger may be endured in order to answer another.
          </p>
        </section>
        <div className="prelude-ledger" aria-label="Initial situation">
          <div>
            <strong>Office</strong>
            <span>Habsburg prince, Bohemian king-elect, imperial claimant</span>
          </div>
          <div>
            <strong>World</strong>
            <span>Empire of estates, jurisdictions, confessions, and negotiated obedience</span>
          </div>
          <div>
            <strong>Pressure</strong>
            <span>Authority must be recovered without making cooperation impossible</span>
          </div>
        </div>
        <button className="choice-button start-role" type="button" onClick={onContinue}>
          <span>Begin</span>
          Open the first report
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
              {role.player_wants.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="compact-list">
            <strong>Constraints</strong>
            <ul>
              {role.constraints.slice(0, 3).map((item) => (
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

function PressurePanel({ state }: { state: GameState }) {
  return (
    <section className="pressure-panel">
      <div className="panel-title">
        <ScrollText size={17} />
        Pressures
      </div>
      {gameDatabase.game_variables.map((variable) => {
        const value = state.pressures[variable.id];
        const danger = variable.high_is_dangerous ? value >= 65 : value < 35;
        return (
          <div className="pressure" key={variable.id}>
            <div className="pressure-row">
              <span>{variable.name}</span>
              <b className={danger ? "danger" : ""}>{value}</b>
            </div>
            <div className="meter" aria-hidden="true">
              <div
                className={danger ? "meter-fill danger-fill" : "meter-fill"}
                style={{ width: `${value}%` }}
              />
            </div>
            <small>{value >= 50 ? variable.high_label : variable.low_label}</small>
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
  onSelectDossier: (dossierId: string) => void;
}) {
  const options = getOptionsForCard(card, state);

  return (
    <article className="event-card">
      <div className="dispatch-meta">
        <span>Report received</span>
        <span>Dated: {card.date_label}</span>
      </div>
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
              <span>
                {availability.available
                  ? option.historical_option
                    ? "Recorded course"
                    : "Course proposed"
                  : "Not credible in this situation"}
              </span>
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
  onSelectDossier: (dossierId: string) => void;
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
            onClick={() => onSelectDossier(part.link.dossier_id)}
          >
            {part.text}
          </button>
        ),
      )}
    </p>
  );
}

function DossierPanel({ dossier }: { dossier: DossierRecord }) {
  return (
    <aside className="dossier-panel" aria-label="Dossier">
      <div className="panel-title">Dossier</div>
      <h3>{dossier.title}</h3>
      <p className="dossier-type">{dossier.dossier_type}</p>
      <p>{dossier.summary}</p>
      <strong>Why it matters</strong>
      <p>{dossier.why_it_matters}</p>
    </aside>
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
  return (
    <section className="aftermath-panel" aria-label="Aftermath">
      <div className="panel-title">Aftermath</div>
      <strong>{entry.choice}</strong>
      <p>{entry.aftermath ?? entry.consequence}</p>
      {entry.aftermath_bullets?.length ? (
        <ul className="aftermath-bullets">
          {entry.aftermath_bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
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
  return (
    <article className="event-card outcome-card">
      <div className="dispatch-meta">
        <span>Memorial of the reign</span>
        <span>Filed after Vienna, 1637</span>
      </div>
      <div className="date-ribbon">1637 assessment</div>
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
      <p className="situation">
        The reign closes with {state.log.length} recorded acts in the docket.
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
