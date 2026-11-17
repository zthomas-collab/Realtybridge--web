import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DealContractors } from '@/components/deal-contractors';

const { contractorsForDeal } = vi.hoisted(() => ({ contractorsForDeal: vi.fn() }));
vi.mock('@/lib/api', () => ({ api: { contractorsForDeal } }));
vi.mock('@/lib/next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderList() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DealContractors dealId="property" />
    </QueryClientProvider>,
  );
}

describe('The Black Book filter', () => {
  const contractors = [
    { id: 'c1', first_name: 'Amanda', last_name: 'Roof', company_name: 'Alpha Roofing', avatar_url: null, email: 'a@roof.com', phone: null, website: null, contractor_services: ['roofing', 'general_contractor'], counties: [], bio: null },
    { id: 'c2', first_name: 'Ben', last_name: 'Fund', company_name: 'Beta Lending', avatar_url: null, email: 'b@lend.com', phone: null, website: null, contractor_services: ['lender'], counties: [], bio: null },
  ];

  it('lists every contractor when no filter is set', async () => {
    contractorsForDeal.mockResolvedValue(contractors);
    renderList();
    expect(await screen.findByText('Alpha Roofing')).toBeInTheDocument();
    expect(screen.getByText('Beta Lending')).toBeInTheDocument();
  });

  it('shows only contractors offering the chosen service', async () => {
    contractorsForDeal.mockResolvedValue(contractors);
    renderList();
    await screen.findByText('Alpha Roofing');
    fireEvent.change(screen.getByLabelText('Filter by service'), { target: { value: 'Lender' } });
    expect(screen.queryByText('Alpha Roofing')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Lending')).toBeInTheDocument();
  });

  it('matches the search against company and contact names', async () => {
    contractorsForDeal.mockResolvedValue(contractors);
    renderList();
    await screen.findByText('Alpha Roofing');
    fireEvent.change(screen.getByLabelText('Search contractors'), { target: { value: 'ben' } });
    expect(screen.queryByText('Alpha Roofing')).not.toBeInTheDocument();
    expect(screen.getByText('Beta Lending')).toBeInTheDocument();
  });

  it('shows an empty message when nothing matches and a Clear button to reset', async () => {
    contractorsForDeal.mockResolvedValue(contractors);
    renderList();
    await screen.findByText('Alpha Roofing');
    fireEvent.change(screen.getByLabelText('Search contractors'), { target: { value: 'nobody' } });
    expect(screen.getByText('No contractors match your filters.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByText('Alpha Roofing')).toBeInTheDocument();
    expect(screen.getByText('Beta Lending')).toBeInTheDocument();
  });
});
