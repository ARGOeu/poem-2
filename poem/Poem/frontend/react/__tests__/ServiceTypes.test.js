import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ServiceTypesList, ServiceTypesBulkAdd } from '../ServiceTypes';
import { WebApi } from '../DataManager';
import { fetchUserDetails } from '../QueryFunctions';
import { QueryClient, QueryClientProvider } from 'react-query';


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

const mockUserDetailsTenantUser = {
  "first_name": "",
  "last_name": "",
  "username": "servtype",
  "is_active": true,
  "is_superuser": false,
  "email": "servtype@example.com",
  "date_joined":"2022-08-23T14:06:28.359916",
  "pk":17,
  "groups": {
    "aggregations": ["EGI"],
    "metrics": ["EGI"],
    "metricprofiles": ["EGI"],
    "thresholdsprofiles": ["EGI"],
    "reports": ["EGI"]
  },
  "token": "TOKEN"
}

const mockUserDetailsTenantAdmin = {
  "first_name": "",
  "last_name": "",
  "username": "servtype",
  "is_active": true,
  "is_superuser": true,
  "email": "servtype@example.com",
  "date_joined":"2022-08-23T14:06:28.359916",
  "pk":17,
  "groups": {
    "aggregations": ["EGI"],
    "metrics": ["EGI"],
    "metricprofiles": ["EGI"],
    "thresholdsprofiles": ["EGI"],
    "reports": ["EGI"]
  },
  "token": "TOKEN"
}

jest.mock('../QueryFunctions', () => {
  return {
    fetchUserDetails : jest.fn()
  }
})

const mockAddServiceTypes = jest.fn()


const mockServTypes = [
  {
    name: 'argo.api',
    description: 'ARGO API service for retrieving status and A/R results.'
  },
  {
    name: 'argo.computeengine',
    description: 'ARGO Compute Engine computes availability and reliability of services.'
  },
  {
    name: 'argo.consumer',
    description: 'ARGO Consumer collects monitoring metrics from monitoring engines.'
  },
  {
    name: 'argo.mon',
    description: 'ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.'
  },
  {
    name: 'argo.poem',
    description: 'POEM is system for managing profiles of probes and metrics in ARGO system.'
  },
  {
    name: 'argo.webui',
    description: 'ARGO web user interface for metric A/R visualization and recalculation management.'
  }
];


function renderAddView() {
  const route = `/ui/servicetypes/add`;
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/servicetypes/add'
            component={ServiceTypesBulkAdd}
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderListView(publicView=undefined) {
  const route = `/ui/${publicView ? 'public_' : ''}servicetypes`;
  const history = createMemoryHistory({ initialEntries: [route] });

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              render={ props => <ServiceTypesList {...props} publicView={true} /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path='/ui/servicetypes/'
              component={ServiceTypesList}
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


describe('Test service types list - Read Only', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchServiceTypes: () => Promise.resolve(mockServTypes),
        addServiceTypes: mockAddServiceTypes,
      }
    })
    fetchUserDetails.mockReturnValue(mockUserDetailsTenantUser)
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    expect(rows[0].textContent).toBe('# Service typeDescription');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')
  })

  test('Test filtering service types', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /2/ })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    expect(rows[0].textContent).toBe('# Service typeDescription');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')
  })

  test('Test filtering public service types', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(10);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(screen.queryByRole('row', { name: /2/ })).not.toBeInTheDocument();
  })
})


describe('Test service types list - Bulk change and delete', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => Object({
      fetchServiceTypes: () => Promise.resolve(mockServTypes),
      addServiceTypes: mockAddServiceTypes,
    })),
    fetchUserDetails.mockReturnValue(mockUserDetailsTenantAdmin)
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    expect(screen.getAllByTestId(/rows-serviceTypes\.[0-9]*/)).toHaveLength(mockServTypes.length)
    expect(screen.getByText(/Name of service/)).toBeVisible()
    expect(screen.getByText(/Description of service/)).toBeVisible()
    expect(screen.getByText(/Delete selected/)).toBeDisabled()
    expect(screen.getByText(/Save/)).toBeDisabled()
    expect(screen.getAllByRole('checkbox', {checked: false})).toBeTruthy()

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.')
    expect(tableRows[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(tableRows[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.')
    expect(tableRows[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(tableRows[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')
  })

  test('Test bulk delete', async () => {
    renderListView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    const firstCheckbox = screen.getAllByRole('checkbox', {checked: false})[0]
    const secondCheckbox = screen.getAllByRole('checkbox', {checked: false})[1]
    fireEvent.click(firstCheckbox)
    fireEvent.click(secondCheckbox)
    expect(firstCheckbox.checked).toBe(true)
    expect(secondCheckbox.checked).toBe(true)
    expect(screen.getByText(/Delete selected/)).toBeEnabled()

    fireEvent.click(screen.getByText(/Delete selected/));
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 2 Service types?')).toBeInTheDocument()
      const yesButton = screen.getByText(/Yes/)
      fireEvent.click(yesButton);
    })
    expect(screen.getAllByTestId(/rows-serviceTypes\.[1-9]*/)).toHaveLength(mockServTypes.length - 2)
    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.webuiARGO web user interface for metric A/R visualization and recalculation management.')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer"
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon"
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem"
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui"
          }
        ]
      )
    })
  })

  test('Test change description', async () => {
    const user = userEvent.setup()
    renderListView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.')

    const inputFirstDesc = screen.getByText('ARGO API service for retrieving status and A/R results.')
    const inputSecondDesc = screen.getByText('ARGO Compute Engine computes availability and reliability of services.')

    // fireEvent does not trigger onChange on react-hook-form Controller fields so using userEvent
    //fireEvent.change(inputFirstDesc, {target: {value: 'CHANGED DESCRIPTION'}})
    //fireEvent.change(inputSecondDesc, {target: {value: 'CHANGED DESCRIPTION 2'}})

    await user.clear(inputFirstDesc)
    await user.type(inputFirstDesc, 'CHANGED DESCRIPTION')
    await expect(inputFirstDesc).toHaveTextContent('CHANGED DESCRIPTION')

    await user.clear(inputSecondDesc)
    await user.type(inputSecondDesc, 'CHANGED DESCRIPTION 2')
    await expect(inputSecondDesc).toHaveTextContent('CHANGED DESCRIPTION 2')

    await waitFor(() => {
      expect(screen.getByText('Save')).toBeEnabled()
    })

    fireEvent.click(screen.getByText(/Save/));
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to change Service type?')).toBeInTheDocument()
      const yesButton = screen.getByText(/Yes/)
      fireEvent.click(yesButton);
    })

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "CHANGED DESCRIPTION",
            "name": "argo.api"
          },
          {
            "description": "CHANGED DESCRIPTION 2",
            "name": "argo.computeengine"
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer"
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon"
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem"
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui"
          }
        ]
      )
    })
  })
})

describe('Test service types list - Bulk add', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => Object({
      fetchServiceTypes: () => Promise.resolve(mockServTypes),
      addServiceTypes: mockAddServiceTypes,
    })),
    fetchUserDetails.mockReturnValue(mockUserDetailsTenantAdmin)
  })

  test('Test that page renders properly', async () => {
    renderAddView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', {'level': 2})).toHaveTextContent(/Add service types/i)
    })

    expect(screen.getByText(/Name:/)).toBeVisible()
    expect(screen.getByText(/Description:/)).toBeVisible()

    expect(screen.getByTestId('input-name')).toBeVisible()
    expect(screen.getByTestId('input-description')).toBeVisible()

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/Service types prepared for submission/i)

    const thead = screen.getAllByRole('rowgroup')[0]
    let tableRows = within(thead).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('#Name of serviceDescription of serviceAction')

    const tbody = screen.getAllByRole('rowgroup')[1]
    tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('Empty data')
  })

  test('Test add', async () => {
    renderAddView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', {'level': 2})).toHaveTextContent(/Add service types/i)
    })

    expect(screen.getByText(/Name:/)).toBeVisible()
    expect(screen.getByText(/Description:/)).toBeVisible()

    expect(screen.getByTestId('input-name')).toBeVisible()
    expect(screen.getByTestId('input-description')).toBeVisible()

    const inputName = screen.getByTestId('input-name')
    fireEvent.change(inputName, {target: {value: 'service.name.1'}})

    const inputDesc = screen.getByTestId('input-description')
    fireEvent.change(inputDesc, {target: {value: 'service description 1'}})

    const addNew = screen.getByText(/Add new/)
    fireEvent.click(addNew);

    await waitFor(() => {
      expect(screen.getAllByTestId(/rows-add-serviceTypes\.[0-9]*/)).toHaveLength(1)
    })

    const inputName2 = screen.getByTestId('input-name')
    fireEvent.change(inputName2, {target: {value: 'service.name.2'}})
    const inputDesc2 = screen.getByTestId('input-description')
    fireEvent.change(inputDesc2, {target: {value: 'service description 2'}})
    const addNew2 = screen.getByText(/Add new/)
    fireEvent.click(addNew2);

    await waitFor(() => {
      expect(screen.getAllByTestId(/rows-add-serviceTypes\.[0-9]*/)).toHaveLength(2)
    })

    fireEvent.click(screen.getByText(/Save/));
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to add 2 Service types?')).toBeInTheDocument()
      const yesButton = screen.getByText(/Yes/)
      fireEvent.click(yesButton);
    })

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            'name': 'argo.api',
            'description': 'ARGO API service for retrieving status and A/R results.'
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "name": "argo.computeengine",
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer"
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon"
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem"
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui"
          },
          {
            "description": "service description 1",
            "name": "service.name.1"
          },
          {
            "description": "service description 2",
            "name": "service.name.2"
          }
        ]
      )
    })
  })

  test('Test add validation', async () => {
    renderAddView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', {'level': 2})).toHaveTextContent(/Add service types/i)
    })

    expect(screen.getByText(/Name:/)).toBeVisible()
    expect(screen.getByText(/Description:/)).toBeVisible()

    expect(screen.getByTestId('input-name')).toBeVisible()
    expect(screen.getByTestId('input-description')).toBeVisible()

    const inputName = screen.getByTestId('input-name')
    fireEvent.change(inputName, {target: {value: 'service name 1'}})

    const inputDesc = screen.getByTestId('input-description')
    fireEvent.change(inputDesc, {target: {value: ''}})

    const addNew = screen.getByText(/Add new/)
    fireEvent.click(addNew);

    await waitFor(() => {
      expect(screen.getAllByTestId(/rows-add-serviceTypes\.[0-9]*/)).toHaveLength(1)
      expect(screen.getByText(/Empty data/)).toBeVisible()
      expect(screen.getByText(/Description can not be empty/)).toBeVisible()
      expect(screen.getByText(/Name can only contain alphanumeric characters, punctuations, underscores and minuses/)).toBeVisible()
    })
  })
})
