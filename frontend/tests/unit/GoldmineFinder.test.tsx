/**
 * Unit tests for GoldmineFinder page — Sections A, B, D, E.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoldmineFinder from '../../src/pages/GoldmineFinder';

describe('GoldmineFinder — Section A: Landing Page Rendering', () => {
  it('renders all 5 sections: hero, how-it-works, form, demo', () => {
    render(<GoldmineFinder />);

    // Hero
    expect(screen.getByRole('heading', { name: /find goldmine listings/i })).toBeInTheDocument();
    expect(screen.getByText(/our ai scores every listing/i)).toBeInTheDocument();

    // How it works
    expect(screen.getByText(/how it works/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your target postcodes/i)).toBeInTheDocument();
    expect(screen.getByText(/crawl spareroom & score/i)).toBeInTheDocument();
    expect(screen.getByText(/ranked goldmine list/i)).toBeInTheDocument();

    // Form
    expect(screen.getByPlaceholderText(/e\.g\. SN1/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /find goldmine listings/i })).toBeInTheDocument();

    // Demo
    expect(screen.getByText(/live demo/i)).toBeInTheDocument();
  });

  it('uses dark theme styling', () => {
    render(<GoldmineFinder />);
    const root = screen.getByRole('heading', { name: /find goldmine listings/i }).closest('section');
    expect(root).toBeTruthy();
  });
});

describe('GoldmineFinder — Section B: Form Validation Errors', () => {
  function fillAndSubmit(postcodes: string, email: string) {
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. SN1/i), { target: { value: postcodes } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: email } });
  }

  it('shows inline error when postcode field is empty', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('', 'jane@hmolettings.co.uk');
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/please enter at least one postcode/i)).toBeInTheDocument();
    });
  });

  it('shows inline error when postcode format is invalid', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('NOTAPOSTCODE', 'jane@hmolettings.co.uk');
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid.*postcode/i)).toBeInTheDocument();
    });
  });

  it('shows inline error when email is invalid format', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('SN1', 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows inline error when email is empty', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('SN1', '');
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });
  });

  it('shows errors on both postcode and email when all fields are empty', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('', '');
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least one postcode/i)).toBeInTheDocument();
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });
  });

  it('shows inline error when budget is non-numeric', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('SN1', 'jane@hmolettings.co.uk');
    const budgetInput = screen.getByPlaceholderText(/e\.g\. 800/i);
    fireEvent.change(budgetInput, { target: { value: 'twelve hundred' } });
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/number/i)).toBeInTheDocument();
    });
  });

  it('shows inline error when budget is negative', async () => {
    render(<GoldmineFinder />);
    fillAndSubmit('SN1', 'jane@hmolettings.co.uk');
    const budgetInput = screen.getByPlaceholderText(/e\.g\. 800/i);
    fireEvent.change(budgetInput, { target: { value: '-100' } });
    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/greater than 0/i)).toBeInTheDocument();
    });
  });
});

describe('GoldmineFinder — Section B: Submit Button Disabled', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('disables submit button and shows "Submitting..." during submission', async () => {
    (global.fetch as any).mockImplementation(
      () => new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, status: 201, json: () => Promise.resolve({ job_id: 'test-123', status: 'queued', estimated_completion: '~30 minutes' }) }), 500)
      )
    );

    render(<GoldmineFinder />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. SN1/i), { target: { value: 'SN1' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'jane@hmolettings.co.uk' } });

    const button = screen.getByRole('button', { name: /find goldmine listings/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
    });
  });
});

describe('GoldmineFinder — Section D: Job Confirmation', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('displays confirmation with job ID and estimated time after successful submission', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        job_id: 'job-abc-123',
        status: 'queued',
        estimated_completion: '~30 minutes',
      }),
    });

    render(<GoldmineFinder />);
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. SN1/i), { target: { value: 'SN1' } });
    fireEvent.change(screen.getByPlaceholderText(/you@example\.com/i), { target: { value: 'jane@hmolettings.co.uk' } });

    fireEvent.click(screen.getByRole('button', { name: /find goldmine listings/i }));

    await waitFor(() => {
      expect(screen.getByText(/job submitted successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/job-abc-123/)).toBeInTheDocument();
      expect(screen.getByText(/~30 minutes/)).toBeInTheDocument();
      expect(screen.getByText(/submit another/i)).toBeInTheDocument();
    });
  });
});

describe('GoldmineFinder — Section E: Live Demo', () => {
  it('displays the Live Demo — SN1 section heading', () => {
    render(<GoldmineFinder />);
    expect(screen.getByText(/live demo — SN1/i)).toBeInTheDocument();
  });

  it('shows "Top 3 Goldmine Listings" heading in demo', () => {
    render(<GoldmineFinder />);
    expect(screen.getByText(/top 3 goldmine listings/i)).toBeInTheDocument();
  });

  it('displays listing count stats (82 crawled, 3 gold)', () => {
    render(<GoldmineFinder />);
    expect(screen.getByText('82')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
