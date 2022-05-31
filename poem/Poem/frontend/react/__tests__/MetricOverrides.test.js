import React from "react"
import "@testing-library/jest-dom/extend-expect"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { createMemoryHistory } from "history"
import { render, screen, waitFor } from "@testing-library/react"
import { Route, Router } from 'react-router-dom';
import { Backend } from "../DataManager"
import { MetricOverrideList } from "../MetricOverrides"


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn()
  }
})

const queryClient = new QueryClient()


setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})


beforeEach(() => {
  jest.clearAllMocks()
  queryClient.clear()
})


const mockConfigurations = [
  {
    id: "2",
    name: "consumer",
    global_attributes: [],
    host_attributes: [],
    metric_parameters: [
      {
        hostname: "eosccore.mon.devel.argo.grnet.gr",
        metric: "argo.AMSPublisher-Check",
        parameter: "-q",
        value: "w:metrics+g:published180"
      }
    ]
  },
  {
    id: "1",
    name: "local",
    global_attributes: [
      {
        attribute: "NAGIOS_ACTUAL_HOST_CERT",
        value: "/etc/nagios/globus/hostcert.pem"
      },
      {
        attribute: "NAGIOS_ACTUAL_HOST_KEY",
        value: "/etc/nagios/globus/hostkey.pem"
      }
    ],
    host_attributes: [
      {
        hostname: "mock.host.name",
        attribute: "attr1",
        value: "some-new-value"
      }
    ],
    metric_parameters: [
      {
        hostname: "eosccore.ui.argo.grnet.gr",
        metric: "org.nagios.ARGOWeb-AR",
        parameter: "-r",
        value: "EOSC_Monitoring"
      },
      {
        hostname: "argo.eosc-portal.eu",
        metric: "org.nagios.ARGOWeb-Status",
        parameter: "-u",
        value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
      }
    ]
  }
]

const mockActiveSession = {
  active: true,
  userdetails: {
    first_name: '',
    last_name: '',
    username: 'poem',
    is_active: true,
    is_superuser: true,
    email: 'test@email.com',
    date_joined: '2019-07-08T12:58:08',
    id: '1',
    groups: {
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['ARGO', 'TEST'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
}


function renderListView() {
  const route = "/ui/administration/metricoverride"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path="/ui/administration/metricoverride"
            render={ props => <MetricOverrideList {...props} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe("Tests for metric overrides listview", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockConfigurations),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Select metric configuration override to change")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(11)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /consumer/i }).textContent).toBe("1consumer")
    expect(screen.getByRole("link", { name: /consumer/i }).closest("a")).toHaveAttribute("href", "/ui/administration/metricoverride/consumer")
    expect(screen.getByRole("row", { name: /local/i }).textContent).toBe("2local")
    expect(screen.getByRole("link", { name: /local/i }).closest("a")).toHaveAttribute("href", "/ui/administration/metricoverride/local")

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metricoverride/add')
  })
})