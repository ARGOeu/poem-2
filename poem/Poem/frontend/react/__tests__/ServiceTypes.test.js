import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { ServiceTypesList, ServiceTypesListPublic, ServiceTypesBulkAdd } from '../ServiceTypes';
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
    description: 'ARGO API service for retrieving status and A/R results.',
    tags: ['topology']
  },
  {
    name: 'argo.computeengine',
    description: 'ARGO Compute Engine computes availability and reliability of services.',
    tags: ['topology']
  },
  {
    name: 'argo.consumer',
    description: 'ARGO Consumer collects monitoring metrics from monitoring engines.',
    tags: ['topology']
  },
  {
    name: 'argo.mon',
    description: 'ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.',
    tags: ['topology']
  },
  {
    name: 'argo.poem',
    description: 'POEM is system for managing profiles of probes and metrics in ARGO system.',
    tags: ['topology']
  },
  {
    name: 'argo.webui',
    description: 'ARGO web user interface for metric A/R visualization and recalculation management.',
    tags: ['topology']
  },
  {
    name: 'poem.added.one',
    description: 'Service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
  },
  {
    name: 'poem.added.two',
    description: 'Service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
  },
  {
    name: 'poem.added.three',
    description: 'Service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
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


function renderListView() {
  const route = '/ui/servicetypes';
  const history = createMemoryHistory({ initialEntries: [route] });

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


function renderListViewPublic() {
  const route = '/ui/public_servicetypes';
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/public_servicetypes/'
            component={ServiceTypesListPublic}
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

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    expect(rows[0].textContent).toBe('# Service typeDescriptionSource');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(rows[8].textContent).toBe('7poem.added.oneService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[9].textContent).toBe('8poem.added.twoService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[10].textContent).toBe('9poem.added.threeService type created from POEM UI and POSTed on WEB-API.poem')
  })

  test('Test filtering service types', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(screen.queryByRole('row', { name: /2/ })).not.toBeInTheDocument();
  })

  test('Test that public page renders properly', async () => {
    renderListViewPublic();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    expect(rows[0].textContent).toBe('# Service typeDescriptionSource');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
  })

  test('Test filtering public service types', async () => {
    renderListView(true);

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Services types');
    })

    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(13);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(screen.getByRole('row', { name: /2/ }).textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(screen.queryByRole('row', { name: /3/ })).not.toBeInTheDocument();

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(14);
    expect(screen.getByRole('row', { name: /1/ }).textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
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

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRows[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRows[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRows[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRows[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRows[7].textContent).toBe('7poem.added.oneService type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[8].textContent).toBe('8poem.added.twoService type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[9].textContent).toBe('9poem.added.threeService type created from POEM UI and POSTed on WEB-API.poem')

    const paginationRoot = screen.getByRole('navigation', {name: /pagination/})
    const paginationLinks = within(paginationRoot).getAllByRole('listitem')
    expect(paginationLinks).toHaveLength(6)
    expect(paginationLinks[0]).toHaveTextContent('First')
    expect(paginationLinks[1]).toHaveTextContent('Previous')
    expect(paginationLinks[2]).toHaveTextContent('1')
    expect(paginationLinks[3]).toHaveTextContent('Next')
    expect(paginationLinks[4]).toHaveTextContent('Last')
    expect(paginationLinks[5]).toHaveTextContent('30 service types')
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
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRowsFiltered[7]).toHaveTextContent('7poem.added.threeService type created from POEM UI and POSTed on WEB-API.poem')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "Service type created from POEM UI and POSTed on WEB-API.",
            "name": "poem.added.three",
            "tags": ["poem"]
          }
        ]
      )
    })
  })

  test('Test change description', async () => {
    //const user = userEvent.setup()
    renderListView();

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')

    const inputFirstDesc = screen.getByText('ARGO API service for retrieving status and A/R results.')
    const inputSecondDesc = screen.getByText('ARGO Compute Engine computes availability and reliability of services.')
    expect(inputFirstDesc).toBeDisabled()
    expect(inputSecondDesc).toBeDisabled()

    // fireEvent does not trigger onChange on react-hook-form Controller fields so using userEvent
    //fireEvent.change(inputFirstDesc, {target: {value: 'CHANGED DESCRIPTION'}})
    //fireEvent.change(inputSecondDesc, {target: {value: 'CHANGED DESCRIPTION 2'}})

    const inputSeventhDesc = within(tableRows[7]).getAllByRole('textbox')[0]
    const inputEightDesc = within(tableRows[8]).getAllByRole('textbox')[0]
    expect(inputSeventhDesc).toBeEnabled()
    expect(inputEightDesc).toBeEnabled()

    await userEvent.clear(inputSeventhDesc)
    await userEvent.type(inputSeventhDesc, 'CHANGED DESCRIPTION')
    await expect(inputSeventhDesc).toHaveTextContent('CHANGED DESCRIPTION')

    await userEvent.clear(inputEightDesc)
    await userEvent.type(inputEightDesc, 'CHANGED DESCRIPTION 2')
    await expect(inputEightDesc).toHaveTextContent('CHANGED DESCRIPTION 2')

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
            "description": "ARGO API service for retrieving status and A/R results.",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "CHANGED DESCRIPTION",
            "name": "poem.added.one",
            "tags": ["poem"]
          },
          {
            "description": "CHANGED DESCRIPTION 2",
            "name": "poem.added.two",
            "tags": ["poem"]
          },
          {
            "description": "Service type created from POEM UI and POSTed on WEB-API.",
            "name": "poem.added.three",
            "tags": ["poem"]
          },
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
            'description': 'ARGO API service for retrieving status and A/R results.',
            'tags': ['topology']
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "name": "argo.computeengine",
            "tags": ['topology']
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "name": "argo.consumer",
            "tags": ['topology']
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "name": "argo.mon",
            "tags": ['topology']
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "name": "argo.poem",
            "tags": ['topology']
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "name": "argo.webui",
            "tags": ['topology']
          },
          {
            "name": 'poem.added.one',
            "description": 'Service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.three',
            "description": 'Service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.two',
            "description": 'Service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "description": "service description 1",
            "name": "service.name.1",
            "tags": ['poem']
          },
          {
            "description": "service description 2",
            "name": "service.name.2",
            "tags": ['poem']
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
