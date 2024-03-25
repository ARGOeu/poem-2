import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import { ServiceTypesList, ServiceTypesBulkAdd } from '../ServiceTypes';
import { WebApi } from '../DataManager';
import { fetchUserDetails } from '../QueryFunctions';
import { QueryClient, QueryClientProvider } from 'react-query';
import useEvent from '@testing-library/user-event';


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
    title: "ARGO API service",
    description: 'ARGO API service for retrieving status and A/R results.',
    tags: ['topology']
  },
  {
    name: 'argo.computeengine',
    title: "ARGO Compute Engine",
    description: 'ARGO Compute Engine computes availability and reliability of services.',
    tags: ['topology']
  },
  {
    name: 'argo.consumer',
    title: "ARGO Consumer",
    description: 'ARGO Consumer collects monitoring metrics from monitoring engines.',
    tags: ['topology']
  },
  {
    name: 'argo.mon',
    title: "ARGO Monitoring Engine",
    description: 'ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.',
    tags: ['topology']
  },
  {
    name: 'argo.poem',
    title: "POEM",
    description: 'POEM is system for managing profiles of probes and metrics in ARGO system.',
    tags: ['topology']
  },
  {
    name: 'argo.webui',
    title: "ARGO web user interface",
    description: 'ARGO web user interface for metric A/R visualization and recalculation management.',
    tags: ['topology']
  },
  {
    name: 'poem.added.one',
    title: "POEM another",
    description: 'Service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
  },
  {
    name: 'poem.added.two',
    title: "POEM extra 2",
    description: '2nd service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
  },
  {
    name: 'poem.added.three',
    title: "POEM extra 3",
    description: '3rd service type created from POEM UI and POSTed on WEB-API.',
    tags: ['poem']
  }
];


function renderAddView(withServiceTypesTitles=undefined) {
  const route = `/ui/servicetypes/add`;

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <ServiceTypesBulkAdd
            webapitoken="token"
            webapiservicetypes="https://mock.servicetypes.com"
            showtitles={ withServiceTypesTitles }
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderListView(withServiceTypesTitles=undefined) {
  const route = '/ui/servicetypes';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <ServiceTypesList
            webapitoken='token'
            webapiservicetypes="https://mock.servicetypes.com"
            showtitles={ withServiceTypesTitles }
            tenantName="TENANT"
            devel={ true }
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderListViewPublic(withServiceTypesTitles=false) {
  const route = '/ui/public_servicetypes';

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <ServiceTypesList
            webapitoken="token"
            webapiservicetypes="https://mock.servicetypes.com"
            showtitles={ withServiceTypesTitles }
            publicView={ true }
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe('Test service types list - Read Only', () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchServiceTypes: () => Promise.resolve(mockServTypes),
        addServiceTypes: mockAddServiceTypes
      }
    })
    fetchUserDetails.mockReturnValue(mockUserDetailsTenantUser)
  })

  test('Test that page renders properly', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    expect(rows[0].textContent).toBe('#Service nameDescriptionSource');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(rows[8].textContent).toBe('7poem.added.oneService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[9].textContent).toBe('8poem.added.two2nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[10].textContent).toBe('9poem.added.three3rd service type created from POEM UI and POSTed on WEB-API.poem')
  })

  test('Test filtering service types', async () => {
    renderListView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
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

  test("Test that page renders properly when showing titles", async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(8)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Service name and title" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(17)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(7)

    expect(rows[0].textContent).toBe("#Service name and titleDescriptionSource")
    expect(rows[2].textContent).toBe('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(rows[8].textContent).toBe('7poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[9].textContent).toBe('8poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[10].textContent).toBe('9poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem')
  })

  test("Test filtering service types when showing titles", async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    const searchFields = screen.getAllByPlaceholderText(/search/i)

    fireEvent.change(searchFields[0], { target: { value: "poem" } })
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(11)

    var rows = screen.getAllByRole("row")
    expect(rows[2].textContent).toBe("1argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology")
    expect(rows[3].textContent).toBe("2poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem")
    expect(rows[4].textContent).toBe("3poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
    expect(rows[5].textContent).toBe("4poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem")

    fireEvent.change(searchFields[1], { target: { value: "2" } })
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(14)
    rows = screen.getAllByRole("row")
    expect(rows[2].textContent).toBe("1poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
  })

  test('Test that public page renders properly', async () => {
    renderListViewPublic();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
    })

    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Service name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Source' })).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(17);
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2);
    expect(screen.getAllByRole('row', { name: '' })).toHaveLength(7);
    expect(rows[0].textContent).toBe('#Service nameDescriptionSource');
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(rows[8].textContent).toBe('7poem.added.oneService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[9].textContent).toBe('8poem.added.two2nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[10].textContent).toBe('9poem.added.three3rd service type created from POEM UI and POSTed on WEB-API.poem')
  })

  test('Test filtering public service types', async () => {
    renderListViewPublic()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i }).textContent).toBe('Service types');
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

  test("Test that public page renders properly when showing titles", async () => {
    renderListViewPublic(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(8)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Service name and title" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(17)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(7)

    expect(rows[0].textContent).toBe("#Service name and titleDescriptionSource")
    expect(rows[2].textContent).toBe('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(rows[3].textContent).toBe('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology');
    expect(rows[4].textContent).toBe('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(rows[5].textContent).toBe('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology');
    expect(rows[6].textContent).toBe('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(rows[7].textContent).toBe('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(rows[8].textContent).toBe('7poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[9].textContent).toBe('8poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(rows[10].textContent).toBe('9poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem')
  })

  test("Test filtering public service types when showing titles", async () => {
    renderListViewPublic(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    const searchFields = screen.getAllByPlaceholderText(/search/i)

    fireEvent.change(searchFields[0], { target: { value: "poem" } })
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(11)

    var rows = screen.getAllByRole("row")
    expect(rows[2].textContent).toBe("1argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology")
    expect(rows[3].textContent).toBe("2poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem")
    expect(rows[4].textContent).toBe("3poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
    expect(rows[5].textContent).toBe("4poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem")

    fireEvent.change(searchFields[1], { target: { value: "2" } })
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(14)
    rows = screen.getAllByRole("row")
    expect(rows[2].textContent).toBe("1poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
  })
})


describe("Test service types list if empty", () => {
  beforeAll(() => {
    WebApi.mockImplementation(() => {
      return {
        fetchServiceTypes: () => Promise.resolve([])
      }
    })
    fetchUserDetails.mockReturnValue(mockUserDetailsTenantUser)
  })

  test("Test that page renders properly", async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i }).textContent).toBe("Service types")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Service name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(17)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(screen.getByRole("row", { name: /no/i }).textContent).toBe("No service types")
  })

  test("Test that public page renders properly", async () => {
    renderListViewPublic()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i }).textContent).toBe("Service types")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(8);
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Service name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeInTheDocument();

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(17)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(screen.getByRole("row", { name: /no/i }).textContent).toBe("No service types")
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

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(5)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service description" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Select" })).toBeInTheDocument()
    expect(table.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(table.getAllByTestId(/st-rows-/)).toHaveLength(9)
    expect(table.getAllByTestId(/checkbox-/)).toHaveLength(10)
    expect(table.getAllByTestId(/checkbox-/, { checked: false })).toHaveLength(10)

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRows[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRows[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRows[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRows[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRows[7].textContent).toBe('7poem.added.oneService type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[8].textContent).toBe('8poem.added.two2nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[9].textContent).toBe('9poem.added.three3rd service type created from POEM UI and POSTed on WEB-API.poem')

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

  test('Test that page renders properly if showing titles', async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(5)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service name and title" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service description" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Select" })).toBeInTheDocument()
    expect(table.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(table.getAllByTestId(/st-rows-/)).toHaveLength(9)
    expect(table.getAllByTestId(/checkbox-/)).toHaveLength(10)
    expect(table.getAllByTestId(/checkbox-/, { checked: false })).toHaveLength(10)

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    const tbody = screen.getAllByRole('rowgroup')[1]
    const tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[1]).toHaveTextContent('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(tableRows[2]).toHaveTextContent('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRows[3]).toHaveTextContent('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRows[4]).toHaveTextContent('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRows[5]).toHaveTextContent('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRows[6]).toHaveTextContent('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRows[7].textContent).toBe('7poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[8].textContent).toBe('8poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRows[9].textContent).toBe('9poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem')

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

  test('Test filtering service types', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: 'co' } });
    expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(2)

    expect(screen.getByTestId("st-rows-0").textContent).toBe('1argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(screen.getByTestId("st-rows-1").textContent).toBe('2argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')

    fireEvent.change(searchFields[1], { target: { value: 'monitor' } })
    expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(1)
    expect(screen.getByTestId("st-rows-0").textContent).toBe('1argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
  })

  test("Test filtering service types when showing titles", async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    const searchFields = screen.getAllByPlaceholderText(/search/i)

    fireEvent.change(searchFields[0], { target: { value: "poem" } })

    expect(screen.getAllByTestId(/st-rows-/i)).toHaveLength(4)

    expect(screen.getByTestId("st-rows-0").textContent).toBe("1argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology")
    expect(screen.getByTestId("st-rows-1").textContent).toBe("2poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem")
    expect(screen.getByTestId("st-rows-2").textContent).toBe("3poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
    expect(screen.getByTestId("st-rows-3").textContent).toBe("4poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem")

    fireEvent.change(searchFields[1], { target: { value: "2" } })
    expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(1)

    expect(screen.getByTestId("st-rows-0").textContent).toBe("1poem.added.twoPOEM extra 22nd service type created from POEM UI and POSTed on WEB-API.poem")
  })

  test('Test bulk delete', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    const firstCheckbox = screen.getByTestId("checkbox-6")
    const secondCheckbox = screen.getByTestId("checkbox-7")
    expect(firstCheckbox).toBeEnabled()
    expect(secondCheckbox).toBeEnabled()
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()
    fireEvent.click(firstCheckbox)
    fireEvent.click(secondCheckbox)

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 2 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRowsFiltered[7]).toHaveTextContent('7poem.added.three3rd service type created from POEM UI and POSTed on WEB-API.poem')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "3rd service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM extra 3",
            "name": "poem.added.three",
            "tags": ["poem"]
          }
        ]
      )
    })
  })

  test('Test bulk delete when showing titles', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    const firstCheckbox = screen.getByTestId("checkbox-6")
    const secondCheckbox = screen.getByTestId("checkbox-7")
    expect(firstCheckbox).toBeEnabled()
    expect(secondCheckbox).toBeEnabled()
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()
    fireEvent.click(firstCheckbox)
    fireEvent.click(secondCheckbox)
    expect(firstCheckbox.checked).toBe(true)
    expect(secondCheckbox.checked).toBe(true)

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 2 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRowsFiltered[7]).toHaveTextContent('7poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "3rd service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM extra 3",
            "name": "poem.added.three",
            "tags": ["poem"]
          }
        ]
      )
    })
  })

  test('Test bulk delete with select all', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    expect(screen.getByTestId("checkbox-6")).toBeEnabled()
    expect(screen.getByTestId("checkbox-7")).toBeEnabled()
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()

    fireEvent.click(screen.getByTestId("checkbox-all"))

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 3 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          }
        ]
      )
    })
  })

  test('Test bulk delete with select all when showing titles', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    expect(screen.getByTestId("checkbox-6")).toBeEnabled()
    expect(screen.getByTestId("checkbox-7")).toBeEnabled()
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()

    fireEvent.click(screen.getByTestId("checkbox-all"))

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 3 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          }
        ]
      )
    })
  })

  test('Test bulk delete with select and filtering', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    expect(screen.getByTestId("checkbox-6")).toBeEnabled()
    expect(screen.getByTestId("checkbox-7")).toBeEnabled
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()

    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: "poem" } });

    fireEvent.click(screen.getByTestId("checkbox-all"))

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 3 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(1)

    expect(screen.getByTestId("st-rows-0").textContent).toBe("1argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology")

    fireEvent.change(searchFields[0], { target: { value: "" } });

    expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(6)

    expect(screen.getByTestId("st-rows-0")).toHaveTextContent('1argo.apiARGO API service for retrieving status and A/R results.topology')
    expect(screen.getByTestId("st-rows-1")).toHaveTextContent('2argo.computeengineARGO Compute Engine computes availability and reliability of services.topology')
    expect(screen.getByTestId("st-rows-2")).toHaveTextContent('3argo.consumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(screen.getByTestId("st-rows-3")).toHaveTextContent('4argo.monARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(screen.getByTestId("st-rows-4")).toHaveTextContent('5argo.poemPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(screen.getByTestId("st-rows-5")).toHaveTextContent('6argo.webuiARGO web user interface for metric A/R visualization and recalculation management.topology')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          }
        ]
      )
    })
  })

  test('Test bulk delete when showing titles with select and filtering', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("checkbox-0")).toBeDisabled()
    expect(screen.getByTestId("checkbox-1")).toBeDisabled()
    expect(screen.getByTestId("checkbox-2")).toBeDisabled()
    expect(screen.getByTestId("checkbox-3")).toBeDisabled()
    expect(screen.getByTestId("checkbox-4")).toBeDisabled()
    expect(screen.getByTestId("checkbox-5")).toBeDisabled()
    expect(screen.getByTestId("checkbox-6")).toBeEnabled()
    expect(screen.getByTestId("checkbox-7")).toBeEnabled()
    expect(screen.getByTestId("checkbox-8")).toBeEnabled()

    const searchFields = screen.getAllByPlaceholderText(/search/i);

    fireEvent.change(searchFields[0], { target: { value: "extra" } });
    fireEvent.change(searchFields[1], { target: { value: "2" } })

    fireEvent.click(screen.getByTestId("checkbox-all"))

    expect(screen.getByRole("button", { name: /delete/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))

    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to delete 1 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    fireEvent.change(searchFields[0], { target: { value: "" } });
    fireEvent.change(searchFields[1], { target: { value: "" } })

    const tbodyFiltered = screen.getAllByRole('rowgroup')[1]
    const tableRowsFiltered = within(tbodyFiltered).getAllByRole('row')
    expect(tableRowsFiltered[1]).toHaveTextContent('1argo.apiARGO API serviceARGO API service for retrieving status and A/R results.topology')
    expect(tableRowsFiltered[2]).toHaveTextContent('2argo.computeengineARGO Compute EngineARGO Compute Engine computes availability and reliability of services.topology')
    expect(tableRowsFiltered[3]).toHaveTextContent('3argo.consumerARGO ConsumerARGO Consumer collects monitoring metrics from monitoring engines.topology')
    expect(tableRowsFiltered[4]).toHaveTextContent('4argo.monARGO Monitoring EngineARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.topology')
    expect(tableRowsFiltered[5]).toHaveTextContent('5argo.poemPOEMPOEM is system for managing profiles of probes and metrics in ARGO system.topology')
    expect(tableRowsFiltered[6]).toHaveTextContent('6argo.webuiARGO web user interfaceARGO web user interface for metric A/R visualization and recalculation management.topology')
    expect(tableRowsFiltered[7]).toHaveTextContent('7poem.added.onePOEM anotherService type created from POEM UI and POSTed on WEB-API.poem')
    expect(tableRowsFiltered[8]).toHaveTextContent('8poem.added.threePOEM extra 33rd service type created from POEM UI and POSTed on WEB-API.poem')

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "Service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM another",
            "name": "poem.added.one",
            "tags": ["poem"]
          },
          {
            "description": "3rd service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM extra 3",
            "name": "poem.added.three",
            "tags": ["poem"]
          }
        ]
      )
    })
  })

  test('Test change description', async () => {
    renderListView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("description-0")).toBeDisabled()
    expect(screen.getByTestId("description-1")).toBeDisabled()
    expect(screen.getByTestId("description-2")).toBeDisabled()
    expect(screen.getByTestId("description-3")).toBeDisabled()
    expect(screen.getByTestId("description-4")).toBeDisabled()
    expect(screen.getByTestId("description-5")).toBeDisabled()
    expect(screen.getByTestId("description-6")).toBeEnabled()
    expect(screen.getByTestId("description-7")).toBeEnabled()
    expect(screen.getByTestId("description-8")).toBeEnabled()

    fireEvent.change(screen.getByTestId("description-6"), { target: { value: "CHANGED DESCRIPTION" } })
    fireEvent.change(screen.getByTestId("description-7"), { target: { value: "CHANGED DESCRIPTION 2" } })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeEnabled()
    })

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to change service type?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "CHANGED DESCRIPTION",
            "title": "POEM another",
            "name": "poem.added.one",
            "tags": ["poem"]
          },
          {
            "description": "CHANGED DESCRIPTION 2",
            "title": "POEM extra 2",
            "name": "poem.added.two",
            "tags": ["poem"]
          },
          {
            "description": "3rd service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM extra 3",
            "name": "poem.added.three",
            "tags": ["poem"]
          },
        ]
      )
    })
  })

  test('Test change description when showing titles', async () => {
    renderListView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    expect(screen.getByTestId("description-0")).toBeDisabled()
    expect(screen.getByTestId("description-1")).toBeDisabled()
    expect(screen.getByTestId("description-2")).toBeDisabled()
    expect(screen.getByTestId("description-3")).toBeDisabled()
    expect(screen.getByTestId("description-4")).toBeDisabled()
    expect(screen.getByTestId("description-5")).toBeDisabled()
    expect(screen.getByTestId("description-6")).toBeEnabled()
    expect(screen.getByTestId("description-7")).toBeEnabled()
    expect(screen.getByTestId("description-8")).toBeEnabled()

    fireEvent.change(screen.getByTestId("description-6"), { target: { value: "CHANGED DESCRIPTION" } })
    fireEvent.change(screen.getByTestId("description-7"), { target: { value: "CHANGED DESCRIPTION 2" } })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeEnabled()
    })

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to change service type?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            "description": "ARGO API service for retrieving status and A/R results.",
            "title": "ARGO API service",
            "name": "argo.api",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ["topology"]
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ["topology"]
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ["topology"]
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ["topology"]
          },
          {
            "description": "CHANGED DESCRIPTION",
            "title": "POEM another",
            "name": "poem.added.one",
            "tags": ["poem"]
          },
          {
            "description": "CHANGED DESCRIPTION 2",
            "title": "POEM extra 2",
            "name": "poem.added.two",
            "tags": ["poem"]
          },
          {
            "description": "3rd service type created from POEM UI and POSTed on WEB-API.",
            "title": "POEM extra 3",
            "name": "poem.added.three",
            "tags": ["poem"]
          },
        ]
      )
    })
  })

  test("Test export csv", async () => {
    const helpers = require("../FileDownload")
    jest.spyOn(helpers, "downloadCSV").mockReturnValueOnce(null)

    renderListView()

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /service/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /csv/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }))

    const content = "name,title,description\r\n" + 
    "argo.api,ARGO API service,ARGO API service for retrieving status and A/R results.\r\n" + 
    "argo.computeengine,ARGO Compute Engine,ARGO Compute Engine computes availability and reliability of services.\r\n" + 
    "argo.consumer,ARGO Consumer,ARGO Consumer collects monitoring metrics from monitoring engines.\r\n" + 
    "argo.mon,ARGO Monitoring Engine,ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.\r\n" + 
    "argo.poem,POEM,POEM is system for managing profiles of probes and metrics in ARGO system.\r\n" + 
    "argo.webui,ARGO web user interface,ARGO web user interface for metric A/R visualization and recalculation management.\r\n" +
    "poem.added.one,POEM another,Service type created from POEM UI and POSTed on WEB-API.\r\n" + 
    "poem.added.three,POEM extra 3,3rd service type created from POEM UI and POSTed on WEB-API.\r\n" +
    "poem.added.two,POEM extra 2,2nd service type created from POEM UI and POSTed on WEB-API."

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1)
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, "TENANT-service-types-devel.csv")
  })

  test("Test import csv and save", async () => {
    renderListView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    const csv = "name,title,description\r\n" + 
    "argo.mon,Internal Checks,Service type for ARGO internal checks\r\n" + 
    "generic.json,JSON check,Generic service that contains metric that checks JSON response of an API endpoint.\r\n" +
    "generic.https,HTTPS web service,Generic checks for https web pages - checks response and certificate validity.\r\n"

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "service-types.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => {
      useEvent.upload(input, file)
    })

    await waitFor(() => {
      expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(3)
    })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(5)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service description" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Select" })).toBeInTheDocument()
    expect(table.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(table.getAllByTestId(/checkbox-/)).toHaveLength(4)
    expect(table.getAllByTestId(/checkbox-/, { checked: false })).toHaveLength(4)

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    expect(screen.getByTestId("st-rows-0").textContent).toBe("1argo.monService type for ARGO internal checkspoem")
    expect(screen.getByTestId("st-rows-1").textContent).toBe("2generic.httpsGeneric checks for https web pages - checks response and certificate validity.poem")
    expect(screen.getByTestId("st-rows-2").textContent).toBe("3generic.jsonGeneric service that contains metric that checks JSON response of an API endpoint.poem")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to change service type?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            description: "Service type for ARGO internal checks",
            title: "Internal Checks",
            name: "argo.mon",
            tags: ["poem"]
          },
          {
            description: "Generic checks for https web pages - checks response and certificate validity.",
            title: "HTTPS web service",
            name: "generic.https",
            tags: ["poem"]
          },
          {
            description: "Generic service that contains metric that checks JSON response of an API endpoint.",
            title: "JSON check",
            name: "generic.json",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test import csv with showing titles and save", async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /service/i })).toBeInTheDocument()
    })

    const csv = "name,title,description\r\n" + 
    "argo.mon,Internal Checks,Service type for ARGO internal checks\r\n" + 
    "generic.json,JSON check,Generic service that contains metric that checks JSON response of an API endpoint.\r\n" +
    "generic.https,HTTPS web service,Generic checks for https web pages - checks response and certificate validity.\r\n"

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "service-types.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => {
      useEvent.upload(input, file)
    })

    await waitFor(() => {
      expect(screen.getAllByTestId(/st-rows-/)).toHaveLength(3)
    })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(5)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service name and title" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Service description" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Source" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Select" })).toBeInTheDocument()
    expect(table.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(table.getAllByTestId(/checkbox-/)).toHaveLength(4)
    expect(table.getAllByTestId(/checkbox-/, { checked: false })).toHaveLength(4)

    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /save/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /csv/i })).toBeEnabled()
    expect(screen.getByRole("button", { name: /add/i })).toBeEnabled()

    expect(screen.getByTestId("st-rows-0").textContent).toBe("1argo.monInternal ChecksService type for ARGO internal checkspoem")
    expect(screen.getByTestId("st-rows-1").textContent).toBe("2generic.httpsHTTPS web serviceGeneric checks for https web pages - checks response and certificate validity.poem")
    expect(screen.getByTestId("st-rows-2").textContent).toBe("3generic.jsonJSON checkGeneric service that contains metric that checks JSON response of an API endpoint.poem")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to change service type?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            description: "Service type for ARGO internal checks",
            title: "Internal Checks",
            name: "argo.mon",
            tags: ["poem"]
          },
          {
            description: "Generic checks for https web pages - checks response and certificate validity.",
            title: "HTTPS web service",
            name: "generic.https",
            tags: ["poem"]
          },
          {
            description: "Generic service that contains metric that checks JSON response of an API endpoint.",
            title: "JSON check",
            name: "generic.json",
            tags: ["poem"]
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

    expect(screen.getByLabelText(/Name:/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title:/)).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Description:/)).toBeInTheDocument()

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/Service types prepared for submission/i)

    const thead = screen.getAllByRole('rowgroup')[0]
    let tableRows = within(thead).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('#Service nameService descriptionAction')

    const tbody = screen.getAllByRole('rowgroup')[1]
    tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('Empty data')
  })

  test('Test that page renders properly with title', async () => {
    renderAddView(true);

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/loading data/i)

    await waitFor(() => {
      expect(screen.getByRole('heading', {'level': 2})).toHaveTextContent(/Add service types/i)
    })

    expect(screen.getByLabelText(/Name:/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Title:/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description:/)).toBeInTheDocument()

    expect(screen.getByRole('heading', {'level': 4})).toHaveTextContent(/Service types prepared for submission/i)

    const thead = screen.getAllByRole('rowgroup')[0]
    let tableRows = within(thead).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('#Service name and titleService descriptionAction')

    const tbody = screen.getAllByRole('rowgroup')[1]
    tableRows = within(tbody).getAllByRole('row')
    expect(tableRows[0]).toHaveTextContent('Empty data')
  })

  test('Test add', async () => {
    renderAddView();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.1'}})

    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 1'}})

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.2'}})
    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 2'}})
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.3'}})
    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 3'}})
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(3)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")
    expect(screen.getByTestId("addrow-2").textContent).toBe("3service.name.3service description 3")

    fireEvent.click(screen.getByTestId("row-remove-1"))

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to add 2 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            'name': 'argo.api',
            'title': "ARGO API service",
            'description': 'ARGO API service for retrieving status and A/R results.',
            'tags': ['topology']
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ['topology']
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ['topology']
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ['topology']
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ['topology']
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ['topology']
          },
          {
            "name": 'poem.added.one',
            "title": "POEM another",
            "description": 'Service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.three',
            "title": "POEM extra 3",
            "description": '3rd service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.two',
            "title": "POEM extra 2",
            "description": '2nd service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "description": "service description 1",
            "title": "",
            "name": "service.name.1",
            "tags": ['poem']
          },
          {
            "description": "service description 3",
            "title": "",
            "name": "service.name.3",
            "tags": ['poem']
          }
        ]
      )
    })
  })

  test('Test add with titles', async () => {
    renderAddView(true);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.1'}})

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service Title 1" } })

    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 1'}})

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service Title 1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.2'}})
    fireEvent.change(screen.getByLabelText(/title/i), {target: {value: 'Service Title 2'}})
    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 2'}})
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service Title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service Title 2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service.name.3'}})
    fireEvent.change(screen.getByLabelText(/title/i), {target: {value: 'Service Title 3'}})
    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: 'service description 3'}})
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(3)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service Title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service Title 2service description 2")
    expect(screen.getByTestId("addrow-2").textContent).toBe("3service.name.3Service Title 3service description 3")

    fireEvent.click(screen.getByTestId("row-remove-1"))

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to add 2 service types?')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            'name': 'argo.api',
            'title': 'ARGO API service',
            'description': 'ARGO API service for retrieving status and A/R results.',
            'tags': ['topology']
          },
          {
            "description": "ARGO Compute Engine computes availability and reliability of services.",
            "title": "ARGO Compute Engine",
            "name": "argo.computeengine",
            "tags": ['topology']
          },
          {
            "description": "ARGO Consumer collects monitoring metrics from monitoring engines.",
            "title": "ARGO Consumer",
            "name": "argo.consumer",
            "tags": ['topology']
          },
          {
            "description": "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            "title": "ARGO Monitoring Engine",
            "name": "argo.mon",
            "tags": ['topology']
          },
          {
            "description": "POEM is system for managing profiles of probes and metrics in ARGO system.",
            "title": "POEM",
            "name": "argo.poem",
            "tags": ['topology']
          },
          {
            "description": "ARGO web user interface for metric A/R visualization and recalculation management.",
            "title": "ARGO web user interface",
            "name": "argo.webui",
            "tags": ['topology']
          },
          {
            "name": 'poem.added.one',
            "title": "POEM another",
            "description": 'Service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.three',
            "title": "POEM extra 3",
            "description": '3rd service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "name": 'poem.added.two',
            "title": "POEM extra 2",
            "description": '2nd service type created from POEM UI and POSTed on WEB-API.',
            "tags": ['poem']
          },
          {
            "description": "service description 1",
            "title": "Service Title 1",
            "name": "service.name.1",
            "tags": ['poem']
          },
          {
            "description": "service description 3",
            "title": "Service Title 3",
            "name": "service.name.3",
            "tags": ['poem']
          }
        ]
      )
    })
  })

  test("Test add with existing service type name", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "argo.poem" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this name already exists"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "",
            name: "service.name.2",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test add with existing service type name with titles", async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "argo.poem" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "POEM" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this name already exists"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "Service title 1",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "Service title 2",
            name: "service.name.2",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test add with already added service type name", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this name already added"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "",
            name: "service.name.2",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test add with already added service type name with titles", async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 3" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this name already added"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "Service title 1",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "Service title 2",
            name: "service.name.2",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test add with existing service title", async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.3" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "POEM" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this title already exists"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "Service title 1",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "Service title 2",
            name: "service.name.2",
            tags: ["poem"]
          }
        ]
      )
    })
  })

  test("Test add with already added service type title", async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.1" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 1" } })

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.2" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 2" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 2" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "service.name.3" } })
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Service title 1" } })
    fireEvent.change(screen.getByLabelText(/desc/i), { target: { value: "service description 3" } })
    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getByText("Service type with this title already added"))
    }) 

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(2)
    })

    expect(screen.getByTestId("addrow-0").textContent).toBe("1service.name.1Service title 1service description 1")
    expect(screen.getByTestId("addrow-1").textContent).toBe("2service.name.2Service title 2service description 2")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByText("Are you sure you want to add 2 service types?")).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/yes/i))

    await waitFor(() => {
      expect(mockAddServiceTypes).toHaveBeenCalledWith(
        [
          {
            name: "argo.api",
            title: "ARGO API service",
            description: "ARGO API service for retrieving status and A/R results.",
            tags: ["topology"]
          },
          {
            description: "ARGO Compute Engine computes availability and reliability of services.",
            title: "ARGO Compute Engine",
            name: "argo.computeengine",
            tags: ["topology"]
          },
          {
            description: "ARGO Consumer collects monitoring metrics from monitoring engines.",
            title: "ARGO Consumer",
            name: "argo.consumer",
            tags: ["topology"]
          },
          {
            description: "ARGO Monitoring Engine gathers monitoring metrics and publishes to messaging service.",
            title: "ARGO Monitoring Engine",
            name: "argo.mon",
            tags: ["topology"]
          },
          {
            description: "POEM is system for managing profiles of probes and metrics in ARGO system.",
            title: "POEM",
            name: "argo.poem",
            tags: ["topology"]
          },
          {
            description: "ARGO web user interface for metric A/R visualization and recalculation management.",
            title: "ARGO web user interface",
            name: "argo.webui",
            tags: ["topology"]
          },
          {
            name: "poem.added.one",
            title: "POEM another",
            description: "Service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.three",
            title: "POEM extra 3",
            description: "3rd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            name: "poem.added.two",
            title: "POEM extra 2",
            description: "2nd service type created from POEM UI and POSTed on WEB-API.",
            tags: ["poem"]
          },
          {
            description: "service description 1",
            title: "Service title 1",
            name: "service.name.1",
            tags: ["poem"]
          },
          {
            description: "service description 2",
            title: "Service title 2",
            name: "service.name.2",
            tags: ["poem"]
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

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service name 1'}})

    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: ''}})

    const addNew = screen.getByText(/Add new/)
    fireEvent.click(addNew);

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByText(/Empty data/)).toBeVisible()
    expect(screen.getByText(/Description cannot be empty/)).toBeVisible()
    expect(screen.queryByText(/Title cannot be empty/)).not.toBeInTheDocument()
    expect(screen.getByText(/Name can only contain alphanumeric characters, punctuations, underscores and minuses/)).toBeVisible()
  })

  test('Test add validation with titles', async () => {
    renderAddView(true)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: /service type/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/name/i), {target: {value: 'service name 1'}})

    fireEvent.change(screen.getByLabelText(/desc/i), {target: {value: ''}})

    fireEvent.click(screen.getByRole("button", { name: /add/i }))

    await waitFor(() => {
      expect(screen.getAllByTestId(/addrow-/)).toHaveLength(1)
    })

    expect(screen.getByText(/Empty data/)).toBeVisible()
    expect(screen.getByText(/Description cannot be empty/)).toBeVisible()
    expect(screen.getByText(/Title cannot be empty/)).toBeVisible()
    expect(screen.getByText(/Name can only contain alphanumeric characters, punctuations, underscores and minuses/)).toBeVisible()
  })
})
