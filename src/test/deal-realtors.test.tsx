import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { DealRealtors } from "@/components/deal-realtors";

const { list, apply, accept } = vi.hoisted(() => ({ list: vi.fn(), apply: vi.fn(), accept: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { realtorsForDeal: list, expressInterest: apply, acceptInterest: accept } }));

it("automatically requests local realtors for the posted deal without applying or making a connection", async () => {
  list.mockResolvedValue([]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><DealRealtors dealId="posted-deal-42" area="Wythe County, Virginia" /></QueryClientProvider>);
  await waitFor(() => expect(list).toHaveBeenCalledWith("posted-deal-42"));
  expect(apply).not.toHaveBeenCalled();
  expect(accept).not.toHaveBeenCalled();
});