import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("Empire in Ashes app", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders the political desk and advances after a choice", async () => {
    const { container } = render(<App />);

    expect(screen.getByRole("heading", { name: /empire in ashes/i })).toBeInTheDocument();
    expect(screen.getByText(/choose your office/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play ferdinand ii/i })).toBeInTheDocument();
    // The select screen surfaces the win/lose model, including the late-game
    // failure modes that were previously truncated off.
    expect(screen.getByText(/what victory looks like/i)).toBeInTheDocument();
    expect(screen.getByText(/how a reign falls/i)).toBeInTheDocument();
    expect(screen.getByText(/political captivity/i)).toBeInTheDocument();
    expect(screen.getByText(/wider european war/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));

    expect(screen.getByText(/ferdinand ii's position/i)).toBeInTheDocument();
    expect(screen.getByText(/Peace of Augsburg/i)).toBeInTheDocument();
    expect(screen.getByText(/public peace and imperial law/i)).toBeInTheDocument();
    expect(screen.getByText(/three unsettled questions/i)).toBeInTheDocument();
    expect(screen.getByText(/reform commission/i)).toBeInTheDocument();
    expect(screen.getByText(/Bohemia is not Inner Austria/i)).toBeInTheDocument();
    expect(screen.getByText(/what every choice costs/i)).toBeInTheDocument();
    expect(screen.getByText(/no safe extreme/i)).toBeInTheDocument();
    expect(screen.getByText(/archduke of inner austria/i)).toBeInTheDocument();
    expect(screen.getByText(/holy roman empire/i)).toBeInTheDocument();
    expect(screen.queryByText(/Wilson/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ferdinand ii enters the game/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/a peace built on silence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/briefing for ferdinand/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/your inheritance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you enter these papers/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /enter the first decision/i }));

    expect(screen.getByText(/a peace built on silence/i)).toBeInTheDocument();
    // The advisor-council conceit is gone: no "report received" or "course proposed".
    expect(screen.queryByText(/report received/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/course proposed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/received at council/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/memorial before the council/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/how we got here/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Peace of Augsburg/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /strict letter of the Reservation/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/historical path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/campaign begins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/historian note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chancery log/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /designer view/i })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Augsburg as a living compact/i }),
    );

    expect(screen.getByText(/aftermath/i)).toBeInTheDocument();
    expect(screen.queryByText(/two armed camps/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/guardian of the settlement/i).length).toBeGreaterThan(0);
    const aftermathDeltas = container.querySelector(".aftermath-deltas");
    expect(aftermathDeltas).toBeInTheDocument();
    expect(aftermathDeltas?.textContent).toMatch(/Estate Trust|Imperial Authority|Confessional/i);
    expect(screen.queryByText(/consequences carried forward/i)).not.toBeInTheDocument();
    expect(container.querySelector(".consequence-docket")).not.toBeInTheDocument();
    expect(container.querySelector(".effect-list")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /proceed to the next decision/i }));

    expect(screen.getByText(/two armed camps/i)).toBeInTheDocument();
    expect(screen.getByText(/earlier restraint/i)).toBeInTheDocument();
    expect(screen.queryByText(/because the court has chosen/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Tolerate the leagues as lawful insurance/i)).toBeInTheDocument();
    expect(screen.queryByText(/aftermath/i)).not.toBeInTheDocument();
  });

  it("opens an in-game dossier popover for an important historical term", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));
    fireEvent.click(screen.getByRole("button", { name: /enter the first decision/i }));
    fireEvent.click(screen.getByRole("button", { name: /Peace of Augsburg/i }));

    const dossier = screen.getByRole("dialog", { name: /dossier/i });
    expect(dossier).toBeInTheDocument();
    expect(screen.getByText(/Lutheranism alongside Catholicism/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it matters/i)).toBeInTheDocument();

    // It is dismissible.
    fireEvent.click(screen.getByRole("button", { name: /close dossier/i }));
    expect(screen.queryByRole("dialog", { name: /dossier/i })).not.toBeInTheDocument();
  });

  it("keeps a private designer docket outside the normal play surface", () => {
    window.history.pushState({}, "", "/?designer=1");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));
    fireEvent.click(screen.getByRole("button", { name: /enter the first decision/i }));

    expect(screen.queryByText(/designer docket/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /designer view/i }));

    expect(screen.getByText(/designer docket/i)).toBeInTheDocument();
    expect(screen.getByText(/current dispatch/i)).toBeInTheDocument();
    expect(screen.getAllByText(/card_1555_augsburg_settlement/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/remaining dispatches/i)).toBeInTheDocument();
    expect(screen.getByText(/active thresholds/i)).toBeInTheDocument();
  });
});
