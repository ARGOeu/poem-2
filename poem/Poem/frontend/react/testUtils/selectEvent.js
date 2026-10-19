import { act } from '@testing-library/react';
import selectEvent from 'react-select-event';

// Flush the menu render before looking up options, then await selection updates.
async function openMenu(input) {
  await act(async () => {
    selectEvent.openMenu(input);
  });
}

async function select(input, options, config) {
  for (const option of Array.isArray(options) ? options : [options]) {
    await openMenu(input);
    await act(async () => {
      await selectEvent.select(input, option, config);
    });
  }
}

export default { openMenu, select };
