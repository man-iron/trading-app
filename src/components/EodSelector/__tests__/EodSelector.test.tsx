/**
 * Tests for EodSelector: option rendering (Current + formatted EOD dates),
 * onChange payloads for Current vs a concrete date, and displayed value in
 * both live and eod modes.
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '../../../testUtils/renderWithProviders';
import { formatEodDateLabel } from '../../../helpers/formatHelpers';
import EodSelector from '../EodSelector';

const eodDates = ['2026-08-05', '2026-08-04', '2026-08-03'];

describe('EodSelector', () => {
  it('displays "Current" when in live mode', () => {
    renderWithProviders(
      <EodSelector eodDates={eodDates} mode="live" eodDate={null} onChange={vi.fn()} />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('Current');
  });

  it('displays the formatted date label when in eod mode', () => {
    renderWithProviders(
      <EodSelector
        eodDates={eodDates}
        mode="eod"
        eodDate="2026-08-04"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('combobox')).toHaveTextContent(
      formatEodDateLabel('2026-08-04')
    );
  });

  it('renders a "Current" option plus one option per EOD date, in order', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EodSelector eodDates={eodDates} mode="live" eodDate={null} onChange={vi.fn()} />
    );
    await user.click(screen.getByRole('combobox'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Current',
      ...eodDates.map(formatEodDateLabel),
    ]);
  });

  it('calls onChange with { mode: "eod", date } when a date is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <EodSelector eodDates={eodDates} mode="live" eodDate={null} onChange={onChange} />
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText(formatEodDateLabel('2026-08-05')));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ mode: 'eod', date: '2026-08-05' });
  });

  it('calls onChange with { mode: "live", date: null } when Current is picked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <EodSelector
        eodDates={eodDates}
        mode="eod"
        eodDate="2026-08-03"
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(
      within(screen.getByRole('listbox')).getByText('Current')
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ mode: 'live', date: null });
  });

  it('renders only the Current option when there are no EOD dates', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EodSelector eodDates={[]} mode="live" eodDate={null} onChange={vi.fn()} />
    );
    await user.click(screen.getByRole('combobox'));
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Current');
  });
});
