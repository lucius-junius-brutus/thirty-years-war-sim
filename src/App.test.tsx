import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("Empire in Ashes app", () => {
  it("renders the political desk and advances after a choice", async () => {
    const { container } = render(<App />);

    expect(screen.getByRole("heading", { name: /empire in ashes/i })).toBeInTheDocument();
    expect(screen.getByText(/choose your office/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /play ferdinand ii/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /play ferdinand ii/i }));

    expect(screen.getByText(/the settlement with gaps/i)).toBeInTheDocument();
    expect(screen.queryByText(/how we got here/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Religious Peace of Augsburg/i })).toBeInTheDocument();
    expect(screen.getByText(/Memorials before the court/i)).toBeInTheDocument();
    expect(screen.queryByText(/campaign begins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/historian note/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chancery log/i)).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /preserve Augsburg as a living compact/i }),
    );

    expect(screen.getByText(/aftermath/i)).toBeInTheDocument();
    expect(screen.queryByText(/leagues of protection/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/The court appears as guardian/i).length).toBeGreaterThan(0);
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
    fireEvent.click(screen.getByRole("button", { name: /Peace of Augsburg/i }));

    expect(screen.getByRole("complementary", { name: /dossier/i })).toBeInTheDocument();
    expect(screen.getByText(/Religious and constitutional settlement/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it matters/i)).toBeInTheDocument();
  });
});
