import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { OperationsProfileDetails, OperationsProfilesList } from '../OperationsProfiles';
import { WebApi } from '../DataManager';


jest.mock('../DataManager', () => {
  return {
    WebApi: jest.fn()
  }
})

const queryClient = new QueryClient();


beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


const mockOperationsProfiles = [
  {
   "id": "1111-2222-3333-4444-5555",
   "date": "2015-01-01",
   "name": "egi_ops",
   "available_states": [
    "OK",
    "WARNING",
    "UNKNOWN",
    "MISSING",
    "CRITICAL",
    "DOWNTIME"
   ],
   "defaults": {
    "down": "DOWNTIME",
    "missing": "MISSING",
    "unknown": "UNKNOWN"
   },
   "operations": [
    {
     "name": "AND",
     "truth_table": [
      {
       "a": "OK",
       "b": "OK",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "OK",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "OK",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "OK",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "OK",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "WARNING",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "WARNING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "WARNING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "WARNING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "UNKNOWN",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "UNKNOWN",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "UNKNOWN",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "MISSING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "MISSING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "MISSING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "CRITICAL",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "CRITICAL",
       "b": "DOWNTIME",
       "x": "CRITICAL"
      },
      {
       "a": "DOWNTIME",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      }
     ]
    },
    {
     "name": "OR",
     "truth_table": [
      {
       "a": "OK",
       "b": "OK",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "WARNING",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "UNKNOWN",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "MISSING",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "CRITICAL",
       "x": "OK"
      },
      {
       "a": "OK",
       "b": "DOWNTIME",
       "x": "OK"
      },
      {
       "a": "WARNING",
       "b": "WARNING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "UNKNOWN",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "MISSING",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "CRITICAL",
       "x": "WARNING"
      },
      {
       "a": "WARNING",
       "b": "DOWNTIME",
       "x": "WARNING"
      },
      {
       "a": "UNKNOWN",
       "b": "UNKNOWN",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "MISSING",
       "x": "UNKNOWN"
      },
      {
       "a": "UNKNOWN",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "UNKNOWN",
       "b": "DOWNTIME",
       "x": "UNKNOWN"
      },
      {
       "a": "MISSING",
       "b": "MISSING",
       "x": "MISSING"
      },
      {
       "a": "MISSING",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "MISSING",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      },
      {
       "a": "CRITICAL",
       "b": "CRITICAL",
       "x": "CRITICAL"
      },
      {
       "a": "CRITICAL",
       "b": "DOWNTIME",
       "x": "CRITICAL"
      },
      {
       "a": "DOWNTIME",
       "b": "DOWNTIME",
       "x": "DOWNTIME"
      }
     ]
    }
   ]
  }
];


function renderListView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}operationsprofiles`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <OperationsProfilesList
              publicView={ true }
              webapioperations="https://mock.operations.com"
              webapitoken="token"
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <OperationsProfilesList
              webapioperations="https://mock.operations.com"
              webapitoken="token"
            />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderDetailsView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}operationsprofiles/egi_ops`;

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_operationsprofiles/:name"
                element={ <OperationsProfileDetails
                  publicView={ true }
                  webapioperations="https://mock.operations.com"
                  webapitoken="token"
                  />
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/operationsprofiles/:name"
                element={ 
                  <OperationsProfileDetails
                    webapioperations="https://mock.operations.com"
                    webapitoken="token"
                  /> 
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


describe('Test list of operations profiles', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchOperationsProfiles: () => Promise.resolve(mockOperationsProfiles)
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select operations profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(9);
    expect(screen.getByRole('row', { name: /egi/i }).textContent).toBe('1egi_ops');
    expect(screen.getByRole('link', { name: /egi/i }).closest('a')).toHaveAttribute('href', '/ui/operationsprofiles/egi_ops');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Select operations profile for details')
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(9);
    expect(screen.getByRole('row', { name: /egi/i }).textContent).toBe('1egi_ops');
    expect(screen.getByRole('link', { name: /egi/i }).closest('a')).toHaveAttribute('href', '/ui/public_operationsprofiles/egi_ops');
    expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
  })
})


describe('Tests for operations profiles detail view', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchOperationProfile: () => Promise.resolve(mockOperationsProfiles[0])
      }
    })
  })

  test('Test that page renders properly', async () => {
    renderDetailsView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Operations profile details')
    })

    expect(screen.getAllByRole('table')).toHaveLength(4);

    const nameField = screen.getByTestId('name');
    const stateTbl = within(screen.getByTestId('tbl-states'));
    const defaultStateTbl = within(screen.getByTestId('tbl-default'));
    const andOpsTbl = within(screen.getByTestId('tbl-operations-AND'));
    const orOpsTbl = within(screen.getByTestId('tbl-operations-OR'));

    expect(nameField.value).toBe('egi_ops');
    expect(nameField).toBeDisabled()

    const stateTblRows = stateTbl.getAllByRole('row');
    expect(stateTblRows).toHaveLength(7);
    expect(stateTblRows[0].textContent).toBe('#Available states');
    expect(stateTblRows[1].textContent).toBe('1OK');
    expect(stateTblRows[2].textContent).toBe('2WARNING');
    expect(stateTblRows[3].textContent).toBe('3UNKNOWN');
    expect(stateTblRows[4].textContent).toBe('4MISSING');
    expect(stateTblRows[5].textContent).toBe('5CRITICAL');
    expect(stateTblRows[6].textContent).toBe('6DOWNTIME');

    const defaultStateTblRows = defaultStateTbl.getAllByRole('row')
    expect(defaultStateTblRows).toHaveLength(4);
    expect(defaultStateTblRows[0].textContent).toBe('DefaultState to be used');
    expect(defaultStateTblRows[1].textContent).toBe('default_downtimeDOWNTIME');
    expect(defaultStateTblRows[2].textContent).toBe('default_missingMISSING');
    expect(defaultStateTblRows[3].textContent).toBe('default_unknownUNKNOWN');

    const andOpsTblRows = andOpsTbl.getAllByRole('row');
    expect(andOpsTblRows).toHaveLength(22);
    expect(andOpsTblRows[0].textContent).toBe('State AState BResult');
    expect(andOpsTblRows[1].textContent).toBe('OKOKOK');
    expect(andOpsTblRows[2].textContent).toBe('OKWARNINGWARNING');
    expect(andOpsTblRows[3].textContent).toBe('OKUNKNOWNUNKNOWN');
    expect(andOpsTblRows[4].textContent).toBe('OKMISSINGMISSING');
    expect(andOpsTblRows[5].textContent).toBe('OKCRITICALCRITICAL');
    expect(andOpsTblRows[6].textContent).toBe('OKDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[7].textContent).toBe('WARNINGWARNINGWARNING');
    expect(andOpsTblRows[8].textContent).toBe('WARNINGUNKNOWNUNKNOWN');
    expect(andOpsTblRows[9].textContent).toBe('WARNINGMISSINGMISSING');
    expect(andOpsTblRows[10].textContent).toBe('WARNINGCRITICALCRITICAL');
    expect(andOpsTblRows[11].textContent).toBe('WARNINGDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[12].textContent).toBe('UNKNOWNUNKNOWNUNKNOWN');
    expect(andOpsTblRows[13].textContent).toBe('UNKNOWNMISSINGMISSING');
    expect(andOpsTblRows[14].textContent).toBe('UNKNOWNCRITICALCRITICAL');
    expect(andOpsTblRows[15].textContent).toBe('UNKNOWNDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[16].textContent).toBe('MISSINGMISSINGMISSING');
    expect(andOpsTblRows[17].textContent).toBe('MISSINGCRITICALCRITICAL');
    expect(andOpsTblRows[18].textContent).toBe('MISSINGDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[19].textContent).toBe('CRITICALCRITICALCRITICAL');
    expect(andOpsTblRows[20].textContent).toBe('CRITICALDOWNTIMECRITICAL');
    expect(andOpsTblRows[21].textContent).toBe('DOWNTIMEDOWNTIMEDOWNTIME');

    const orOpsTblRows = orOpsTbl.getAllByRole('row');
    expect(orOpsTblRows).toHaveLength(22);
    expect(orOpsTblRows[0].textContent).toBe('State AState BResult');
    expect(orOpsTblRows[1].textContent).toBe('OKOKOK');
    expect(orOpsTblRows[2].textContent).toBe('OKWARNINGOK');
    expect(orOpsTblRows[3].textContent).toBe('OKUNKNOWNOK');
    expect(orOpsTblRows[4].textContent).toBe('OKMISSINGOK');
    expect(orOpsTblRows[5].textContent).toBe('OKCRITICALOK');
    expect(orOpsTblRows[6].textContent).toBe('OKDOWNTIMEOK');
    expect(orOpsTblRows[7].textContent).toBe('WARNINGWARNINGWARNING');
    expect(orOpsTblRows[8].textContent).toBe('WARNINGUNKNOWNWARNING');
    expect(orOpsTblRows[9].textContent).toBe('WARNINGMISSINGWARNING');
    expect(orOpsTblRows[10].textContent).toBe('WARNINGCRITICALWARNING');
    expect(orOpsTblRows[11].textContent).toBe('WARNINGDOWNTIMEWARNING');
    expect(orOpsTblRows[12].textContent).toBe('UNKNOWNUNKNOWNUNKNOWN');
    expect(orOpsTblRows[13].textContent).toBe('UNKNOWNMISSINGUNKNOWN');
    expect(orOpsTblRows[14].textContent).toBe('UNKNOWNCRITICALCRITICAL');
    expect(orOpsTblRows[15].textContent).toBe('UNKNOWNDOWNTIMEUNKNOWN');
    expect(orOpsTblRows[16].textContent).toBe('MISSINGMISSINGMISSING');
    expect(orOpsTblRows[17].textContent).toBe('MISSINGCRITICALCRITICAL');
    expect(orOpsTblRows[18].textContent).toBe('MISSINGDOWNTIMEDOWNTIME');
    expect(orOpsTblRows[19].textContent).toBe('CRITICALCRITICALCRITICAL');
    expect(orOpsTblRows[20].textContent).toBe('CRITICALDOWNTIMECRITICAL');
    expect(orOpsTblRows[21].textContent).toBe('DOWNTIMEDOWNTIMEDOWNTIME');
  })

  test('Test that public page renders properly', async () => {
    renderDetailsView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /profile/i }).textContent).toBe('Operations profile details')
    })

    expect(screen.getAllByRole('table')).toHaveLength(4);

    const nameField = screen.getByTestId('name');
    const stateTbl = within(screen.getByTestId('tbl-states'));
    const defaultStateTbl = within(screen.getByTestId('tbl-default'));
    const andOpsTbl = within(screen.getByTestId('tbl-operations-AND'));
    const orOpsTbl = within(screen.getByTestId('tbl-operations-OR'));

    expect(nameField.value).toBe('egi_ops');
    expect(nameField).toBeDisabled()

    const stateTblRows = stateTbl.getAllByRole('row');
    expect(stateTblRows).toHaveLength(7);
    expect(stateTblRows[0].textContent).toBe('#Available states');
    expect(stateTblRows[1].textContent).toBe('1OK');
    expect(stateTblRows[2].textContent).toBe('2WARNING');
    expect(stateTblRows[3].textContent).toBe('3UNKNOWN');
    expect(stateTblRows[4].textContent).toBe('4MISSING');
    expect(stateTblRows[5].textContent).toBe('5CRITICAL');
    expect(stateTblRows[6].textContent).toBe('6DOWNTIME');

    const defaultStateTblRows = defaultStateTbl.getAllByRole('row')
    expect(defaultStateTblRows).toHaveLength(4);
    expect(defaultStateTblRows[0].textContent).toBe('DefaultState to be used');
    expect(defaultStateTblRows[1].textContent).toBe('default_downtimeDOWNTIME');
    expect(defaultStateTblRows[2].textContent).toBe('default_missingMISSING');
    expect(defaultStateTblRows[3].textContent).toBe('default_unknownUNKNOWN');

    const andOpsTblRows = andOpsTbl.getAllByRole('row');
    expect(andOpsTblRows).toHaveLength(22);
    expect(andOpsTblRows[0].textContent).toBe('State AState BResult');
    expect(andOpsTblRows[1].textContent).toBe('OKOKOK');
    expect(andOpsTblRows[2].textContent).toBe('OKWARNINGWARNING');
    expect(andOpsTblRows[3].textContent).toBe('OKUNKNOWNUNKNOWN');
    expect(andOpsTblRows[4].textContent).toBe('OKMISSINGMISSING');
    expect(andOpsTblRows[5].textContent).toBe('OKCRITICALCRITICAL');
    expect(andOpsTblRows[6].textContent).toBe('OKDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[7].textContent).toBe('WARNINGWARNINGWARNING');
    expect(andOpsTblRows[8].textContent).toBe('WARNINGUNKNOWNUNKNOWN');
    expect(andOpsTblRows[9].textContent).toBe('WARNINGMISSINGMISSING');
    expect(andOpsTblRows[10].textContent).toBe('WARNINGCRITICALCRITICAL');
    expect(andOpsTblRows[11].textContent).toBe('WARNINGDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[12].textContent).toBe('UNKNOWNUNKNOWNUNKNOWN');
    expect(andOpsTblRows[13].textContent).toBe('UNKNOWNMISSINGMISSING');
    expect(andOpsTblRows[14].textContent).toBe('UNKNOWNCRITICALCRITICAL');
    expect(andOpsTblRows[15].textContent).toBe('UNKNOWNDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[16].textContent).toBe('MISSINGMISSINGMISSING');
    expect(andOpsTblRows[17].textContent).toBe('MISSINGCRITICALCRITICAL');
    expect(andOpsTblRows[18].textContent).toBe('MISSINGDOWNTIMEDOWNTIME');
    expect(andOpsTblRows[19].textContent).toBe('CRITICALCRITICALCRITICAL');
    expect(andOpsTblRows[20].textContent).toBe('CRITICALDOWNTIMECRITICAL');
    expect(andOpsTblRows[21].textContent).toBe('DOWNTIMEDOWNTIMEDOWNTIME');

    const orOpsTblRows = orOpsTbl.getAllByRole('row');
    expect(orOpsTblRows).toHaveLength(22);
    expect(orOpsTblRows[0].textContent).toBe('State AState BResult');
    expect(orOpsTblRows[1].textContent).toBe('OKOKOK');
    expect(orOpsTblRows[2].textContent).toBe('OKWARNINGOK');
    expect(orOpsTblRows[3].textContent).toBe('OKUNKNOWNOK');
    expect(orOpsTblRows[4].textContent).toBe('OKMISSINGOK');
    expect(orOpsTblRows[5].textContent).toBe('OKCRITICALOK');
    expect(orOpsTblRows[6].textContent).toBe('OKDOWNTIMEOK');
    expect(orOpsTblRows[7].textContent).toBe('WARNINGWARNINGWARNING');
    expect(orOpsTblRows[8].textContent).toBe('WARNINGUNKNOWNWARNING');
    expect(orOpsTblRows[9].textContent).toBe('WARNINGMISSINGWARNING');
    expect(orOpsTblRows[10].textContent).toBe('WARNINGCRITICALWARNING');
    expect(orOpsTblRows[11].textContent).toBe('WARNINGDOWNTIMEWARNING');
    expect(orOpsTblRows[12].textContent).toBe('UNKNOWNUNKNOWNUNKNOWN');
    expect(orOpsTblRows[13].textContent).toBe('UNKNOWNMISSINGUNKNOWN');
    expect(orOpsTblRows[14].textContent).toBe('UNKNOWNCRITICALCRITICAL');
    expect(orOpsTblRows[15].textContent).toBe('UNKNOWNDOWNTIMEUNKNOWN');
    expect(orOpsTblRows[16].textContent).toBe('MISSINGMISSINGMISSING');
    expect(orOpsTblRows[17].textContent).toBe('MISSINGCRITICALCRITICAL');
    expect(orOpsTblRows[18].textContent).toBe('MISSINGDOWNTIMEDOWNTIME');
    expect(orOpsTblRows[19].textContent).toBe('CRITICALCRITICALCRITICAL');
    expect(orOpsTblRows[20].textContent).toBe('CRITICALDOWNTIMECRITICAL');
    expect(orOpsTblRows[21].textContent).toBe('DOWNTIMEDOWNTIMEDOWNTIME');
  })
})