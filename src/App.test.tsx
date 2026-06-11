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

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));

    expect(screen.getByText(/ferdinand's inheritance/i)).toBeInTheDocument();
    expect(screen.getByText(/archduke of inner austria/i)).toBeInTheDocument();
    expect(screen.getByText(/holy roman empire/i)).toBeInTheDocument();
    expect(screen.queryByText(/the settlement with gaps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/briefing for ferdinand/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open the first report/i }));

    expect(screen.getByText(/the settlement with gaps/i)).toBeInTheDocument();
    expect(screen.getByText(/report received/i)).toBeInTheDocument();
    expect(screen.getByText(/dated:/i)).toBeInTheDocument();
    expect(screen.queryByText(/received at council/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/memorial before the council/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/how we got here/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Religious Peace of Augsburg/i })).toBeInTheDocument();
    expect(screen.getAllByText(/course proposed/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/historical path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/campaign begins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/historian note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chancery log/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /designer view/i })).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /preserve Augsburg as a living compact/i }),
    );

    expect(screen.getByText(/aftermath/i)).toBeInTheDocument();
    expect(screen.queryByText(/leagues of protection/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/The court appears as guardian/i).length).toBeGreaterThan(0);
    const aftermathBullets = container.querySelector(".aftermath-bullets");
    expect(aftermathBullets).toBeInTheDocument();
    expect(aftermathBullets?.textContent).toMatch(
      /Moderate estates|Doubtful estates|Petitioners/i,
    );
    expect(screen.queryByText(/consequences carried forward/i)).not.toBeInTheDocument();
    expect(container.querySelector(".consequence-docket")).not.toBeInTheDocument();
    expect(container.querySelector(".effect-list")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /proceed to the next decision/i }));

    expect(screen.getByText(/leagues of protection/i)).toBeInTheDocument();
    expect(screen.getByText(/chosen consultation over immediate enforcement/i)).toBeInTheDocument();
    expect(screen.getByText(/Tolerate the leagues as temporary instruments/i)).toBeInTheDocument();
    expect(screen.queryByText(/aftermath/i)).not.toBeInTheDocument();
  });

  it("keeps important historical terms inside an in-game dossier panel", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));
    fireEvent.click(screen.getByRole("button", { name: /open the first report/i }));
    fireEvent.click(screen.getByRole("button", { name: /Peace of Augsburg/i }));

    expect(screen.getByRole("complementary", { name: /dossier/i })).toBeInTheDocument();
    expect(screen.getByText(/Religious and constitutional settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it matters/i)).toBeInTheDocument();
  });

  it("keeps a private designer docket outside the normal play surface", () => {
    window.history.pushState({}, "", "/?designer=1");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));
    fireEvent.click(screen.getByRole("button", { name: /open the first report/i }));

    expect(screen.queryByText(/designer docket/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /designer view/i }));

    expect(screen.getByText(/designer docket/i)).toBeInTheDocument();
    expect(screen.getByText(/current dispatch/i)).toBeInTheDocument();
    expect(screen.getAllByText(/card_1555_augsburg_settlement/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/remaining dispatches/i)).toBeInTheDocument();
    expect(screen.getByText(/active thresholds/i)).toBeInTheDocument();
  });
});
