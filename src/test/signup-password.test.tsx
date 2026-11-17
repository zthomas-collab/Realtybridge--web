import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "@/screens/login";

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { signUp, getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }) },
} }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: {} } }));
vi.mock("@/lib/next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }), usePathname: () => "/signup",
  useSearchParams: () => new URLSearchParams(),
}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function enterPasswords(confirm: string) {
  render(<LoginPage />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "signup@example.com" } });
  fireEvent.change(screen.getByLabelText("Create password"), { target: { value: "Example-password-123" } });
  fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: confirm } });
  fireEvent.submit(screen.getByLabelText("Email").closest("form") as HTMLFormElement);
}

describe("Signup password confirmation", () => {
  it("does not create an account when passwords do not match", async () => {
    enterPasswords("Different-password-123");
    await waitFor(() => expect(signUp).not.toHaveBeenCalled());
  });
  it("creates the account with the chosen password when confirmation matches", async () => {
    enterPasswords("Example-password-123");
    await waitFor(() => expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      email: "signup@example.com", password: "Example-password-123",
    })));
  });
});