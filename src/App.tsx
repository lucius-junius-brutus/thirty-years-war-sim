import { RotateCcw, ScrollText, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { gameDatabase } from "./data/gameDatabase";
import type { CardRecord, PressureKey } from "./domain/types";
import {
  chooseOption,
  createInitialGameState,
  getCurrentCard,
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
  const [screen, setScreen] = useState<"role-select" | "play">(() => {
    const storage = getBrowserStorage();
    return storage && loadGame(storage) ? "play" : "role-select";
  });
  const [showAftermath, setShowAftermath] = useState(false);

  const role = getRole(gameDatabase, state.roleId);
  const card = getCurrentCard(gameDatabase, state);
  const outcome = state.completed ? scoreOutcome(gameDatabase, state) : null;
  const latestEntry = state.log.at(-1);

  function commitChoice(cardId: string, optionId: string) {
    const next = chooseOption(gameDatabase, state, cardId, optionId);
    setState(next);
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
    const storage = getBrowserStorage();
    if (storage) {
      clearGame(storage);
    }
  }

  function startRole() {
    const next = createInitialGameState(gameDatabase, defaultRoleId);
    setState(next);
    setScreen("play");
    setShowAftermath(false);
    const storage = getBrowserStorage();
    if (storage) {
      clearGame(storage);
    }
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
          src="/assets/imperial-seal.svg"
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
      ) : (
        <section className="desk-grid" aria-label="Political desk">
          <aside className="side-panel">
            <PressurePanel state={state} />
          </aside>

          <section className="main-panel">
            {showAftermath && latestEntry ? (
              <AftermathPanel
                entry={latestEntry}
                onContinue={() => setShowAftermath(false)}
              />
            ) : card ? (
              <EventCard card={card} onChoose={commitChoice} />
            ) : (
              <OutcomePanel state={state} outcome={outcome} onRestart={restart} />
            )}
          </section>
        </section>
      )}
    </main>
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
  onChoose,
}: {
  card: CardRecord;
  onChoose: (cardId: string, optionId: string) => void;
}) {
  return (
    <article className="event-card">
      <div className="date-ribbon">{card.date_label}</div>
      <h2>{card.title}</h2>
      <section className="briefing-box">
        <div className="panel-title">How we got here</div>
        <p>{card.briefing}</p>
      </section>
      <p className="situation">{card.situation}</p>

      <div className="choices" aria-label="Choices">
        {card.options.map((option) => (
          <button
            className="choice-button"
            key={option.id}
            type="button"
            onClick={() => onChoose(card.id, option.id)}
          >
            <span>{option.historical_option ? "Historical path" : "Option"}</span>
            {option.label}
          </button>
        ))}
      </div>
    </article>
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
      <p>{entry.consequence}</p>
      <EffectList effects={entry.pressure_delta} />
      <button className="choice-button continue-button" type="button" onClick={onContinue}>
        <span>Continue</span>
        Proceed to the next decision
      </button>
    </section>
  );
}

function EffectList({ effects }: { effects: Partial<Record<PressureKey, number>> }) {
  const entries = Object.entries(effects);
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="effect-list">
      {entries.map(([key, value]) => {
        const variable = gameDatabase.game_variables.find((item) => item.id === key);
        return (
          <span key={key} className={value >= 0 ? "up" : "down"}>
            {variable?.name ?? key} {value >= 0 ? "+" : ""}
            {value}
          </span>
        );
      })}
    </div>
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
      <div className="date-ribbon">1623 assessment</div>
      <h2>{outcome?.title ?? "Campaign Complete"}</h2>
      <p className="situation">
        Ferdinand has survived the first crisis cycle, but the settlement now has
        a political shape. Your decisions produced {state.log.length} recorded
        acts, each tied to source-backed or review-marked causal claims.
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
