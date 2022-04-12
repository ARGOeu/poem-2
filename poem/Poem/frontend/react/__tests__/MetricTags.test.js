import "@testing-library/jest-dom/extend-expect"
import React from "react"
import { createMemoryHistory } from "history"
import { Route, Router } from "react-router-dom"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MetricTagsComponent, MetricTagsList } from "../MetricTags"
import { Backend } from "../DataManager"
import selectEvent from "react-select-event"
import { NotificationManager } from "react-notifications"


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn()
  }
})

jest.setTimeout(50000)

const mockChangeObject = jest.fn()


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


const mockListTags = [
  {
    id: "1",
    name: "deprecated"
  },
  {
    id: "2",
    name: "eol"
  },
  {
    id: "3",
    name: "internal"
  },
  {
    id: "4",
    name: "test"
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
    id: '1'
  }
};


const mockMetricTemplates = [
  {
    id: "1",
    name: "argo.AMS-Check",
    mtype: "Active",
    description: "",
    ostag: ["CentOS 7"],
    tags: ["ams", "argo", "messaging"],
    probeversion: "ams-probe (0.1.14)",
    probeexecutable: "ams-probe",
    config: [
      { key: "maxCheckAttempts", value: "3" },
      { key: "timeout", value: "60" },
      { key: "path", value: "/usr/libexec/argo-monitoring/probes/argo" },
      { key: "interval", value: "5" },
      { key: "retryInterval", value: "3" }
    ],
    flags: [{ key: "OBSESS", value: "1" }],
    dependency: [],
    attribute: [{ key: "argo.ams_TOKEN", value: "--token" }],
    parameter: [{ key: "--project", value: "EGI" }],
    file_parameter: [],
    file_attribute: [],
    parent: ""
  },
  {
    id: "2",
    name: "argo.AMSPublisher-Check",
    mtype: "Active",
    description: "",
    ostag: ["CentOS 7"],
    tags: ["ams", "ams publisher", "argo", "internal", "messaging"],
    probeversion: "ams-publisher-probe (0.1.14)",
    probeexecutable: "ams-publisher-probe",
    config: [
      { key: "interval", value: "180" },
      { key: "maxCheckAttempts", value: "1" },
      { key: "path", value: "/usr/libexec/argo-monitoring/probes/argo" },
      { key: "retryInterval", value: "1" },
      { key: "timeout", value: "120" }
    ],
    flags: [
      { key: "NOHOSTNAME", value: "1" },
      { key: "NOTIMEOUT", value: "1" },
      { key: "NOPUBLISH", value: "1" }
    ],
    dependency: [],
    attribute: [],
    parameter: [
      { key: "-s", value: "/var/run/argo-nagios-ams-publisher/sock" },
      { key: "-q", value: "'w:metrics+g:published180' -c 4000 -q 'w:alarms+g:published180' -c 1 -q 'w:metricsdevel+g:published180' -c 4000" }
    ],
    file_parameter: [],
    file_attribute: [],
    parent: ""
  },
  {
    id: "3",
    name: "generic.certificate.validity",
    mtype: "Active",
    description: "",
    ostag: ["CentOS 7"],
    tags: ["certificate", "harmonized"],
    probeversion: "check_ssl_cert (1.84.0)",
    probeexecutable: "check_ssl_cert",
    config: [
      { key: "timeout", value: "60" },
      { key: "retryInterval", value: "30" },
      { key: "path", value: "$USER1$" },
      { key: "maxCheckAttempts", value: "2" },
      { key: "interval", value: "240" }
    ],
    flags: [{ key: "OBSESS", value: "1" }],
    dependency: [],
    attribute: [
      { key: "NAGIOS_HOST_CERT", value: "-C" },
      { key: "NAGIOS_HOST_KEY", value: "-K" }
    ],
    parameter: [
      { key: "-w", value: "30 -c 0 -N --altnames" },
      { key: "--rootcert-dir", value: "/etc/grid-security/certificates" },
      { key: "--rootcert-file", value: "/etc/pki/tls/certs/ca-bundle.crt" }
    ],
    file_parameter: [],
    file_attribute: [],
    parent: ""
  },
  {
    id: "4",
    name: "generic.http.connect",
    mtype: "Active",
    description: "",
    ostag: ["CentOS 7"],
    tags: ["harmonized", "http", "network"],
    probeversion: "check_http (present)",
    probeexecutable: "check_http",
    config: [
        { key: "interval", value: "5" },
        { key: "maxCheckAttempts", value: "3" },
        { key: "path", value: "$USER1$" },
        { key: "retryInterval", value: "3" },
        { key: "timeout", value: "60" }
    ],
    flags: [
        { key: "OBSESS", value: "1" },
        { key: "PNP", value: "1" }
    ],
    dependency: [],
    attribute: [
        { key: "SSL", value: "-S --sni" },
        { key: "PORT", value: "-p" },
        { key: "PATH", value: "-u" }
    ],
    parameter: [
        { key: "--link", value: "" },
        { key: "--onredirect", value: "follow" }
    ],
    file_parameter: [],
    file_attribute: [],
    parent: ""
  },
  {
    id: "5",
    name: "generic.tcp.connect",
    mtype: "Active",
    description: "",
    ostag: ["CentOS 7"],
    tags: ["harmonized", "network", "tcp"],
    probeversion: "check_tcp (present)",
    probeexecutable: "check_tcp",
    config: [
      { key: "interval", value: "5" },
      { key: "maxCheckAttempts", value: "3" },
      { key: "path", value: "$USER1$" },
      { key: "retryInterval", value: "3" },
      { key: "timeout", value: "120" }
    ],
    flags: [
      { key: "OBSESS", value: "1" },
      { key: "PNP", value: "1" }
    ],
    dependency: [],
    attribute: [],
    parameter: [{ key: "-p", value: "443" }],
    file_parameter: [],
    file_attribute: [],
    parent: ""
  }
]


function renderListView(publicView) {
  const route = `/ui/${publicView ? "public_" : ""}metrictags`
  const history = createMemoryHistory({ initialEntries: [route] })

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              render={ props => <MetricTagsList {...props} publicView={true} /> }
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
              render={ props => <MetricTagsList {...props} /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView) {
  const route = `/ui/${publicView ? "public_" : ""}metrictags/internal`
  const history = createMemoryHistory({ initialEntries: [route] })

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Route
              path="/ui/public_metrictags/:name"
              render={ props => <MetricTagsComponent {...props} publicView={true} /> }
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
              path="/ui/metrictags/:name"
              render={ props => <MetricTagsComponent {...props} /> }
            />
          </Router>
        </QueryClientProvider>
      )
    }
}


describe("Test list of metric tags", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockListTags)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Select metric tag to change")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText("Search")).toHaveLength(1)

    expect(screen.getAllByRole("row")).toHaveLength(22)
    expect(screen.getByRole("row", { name: /deprecated/i }).textContent).toBe("1deprecated")
    expect(screen.getByRole("row", { name: /eol/i }).textContent).toBe("2eol")
    expect(screen.getByRole("row", { name: /internal/ }).textContent).toBe("3internal")
    expect(screen.getByRole("row", { name: /test/i }).textContent).toBe("4test")

    expect(screen.getByRole("link", { name: /deprecated/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/deprecated")
    expect(screen.getByRole("link", { name: /eol/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/eol")
    expect(screen.getByRole("link", { name: /internal/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/internal")
    expect(screen.getByRole("link", { name: /test/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/test")

    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
  })

  test("Test that public page renders properly", async () => {
    renderListView(true)

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Select metric tag for details")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText("Search")).toHaveLength(1)

    expect(screen.getAllByRole("row")).toHaveLength(22)
    expect(screen.getByRole("row", { name: /deprecated/i }).textContent).toBe("1deprecated")
    expect(screen.getByRole("row", { name: /eol/i }).textContent).toBe("2eol")
    expect(screen.getByRole("row", { name: /internal/ }).textContent).toBe("3internal")
    expect(screen.getByRole("row", { name: /test/i }).textContent).toBe("4test")

    expect(screen.getByRole("link", { name: /deprecated/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/deprecated")
    expect(screen.getByRole("link", { name: /eol/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/eol")
    expect(screen.getByRole("link", { name: /internal/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/internal")
    expect(screen.getByRole("link", { name: /test/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/test")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})


describe("Test metric tags changeview", () => {
  jest.spyOn(NotificationManager, "success")
  jest.spyOn(NotificationManager, "error")
  jest.spyOn(queryClient, "invalidateQueries")

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/metrictags/internal":
              return Promise.resolve({id: "3", name: "internal"})

            case "/api/v2/internal/public_metrictags/internal":
              return Promise.resolve({id: "3", name: "internal"})

            case "/api/v2/internal/metrics4tags/internal":
              return Promise.resolve(["argo.AMS-Check", "argo.AMSPublisher-Check"])

            case "/api/v2/internal/public_metrics4tags/internal":
              return Promise.resolve(["argo.AMS-Check", "argo.AMSPublisher-Check"])

            case "/api/v2/internal/metrictemplates":
              return Promise.resolve(mockMetricTemplates)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Change metric tag")
    })

    expect(screen.getByTestId("form")).toHaveFormValues({
      "name": "internal"
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("internal")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(3)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")
    expect(table.getByRole("columnheader", { name: /action/i }).textContent).toBe("Actions")

    expect(table.getAllByRole("row")).toHaveLength(4)
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(2)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(2)
    expect(table.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()

    expect(table.queryByText(/generic/i)).not.toBeInTheDocument()
    selectEvent.openMenu(table.getByText("argo.AMS-Check"))
    expect(table.getByText("generic.certificate.validity")).toBeInTheDocument()
    expect(table.getByText("generic.http.connect")).toBeInTheDocument()
    expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    expect(table.getAllByText("argo.AMS-Check")).toHaveLength(1)
    expect(table.getAllByText("argo.AMSPublisher-Check")).toHaveLength(1)

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test filter metrics", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "publisher" } })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()
    expect(table.queryByText("argo.AMS-Check")).not.toBeInTheDocument()
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)

    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test that public page renders properly", async () => {
    renderChangeView(true)

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Metric tag details")
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("internal")
    expect(nameField).toBeDisabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(2)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")

    expect(table.getAllByRole("row")).toHaveLength(4)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1argo.AMS-Check")
    expect(table.getByRole("row", { name: /2/i }).textContent).toBe("2argo.AMSPublisher-Check")

    expect(table.queryByTestId(/remove-/i)).not.toBeInTheDocument()
    expect(table.queryByTestId(/insert-/i)).not.toBeInTheDocument()

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test filter metrics in public changeview", async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "publisher" } })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1argo.AMSPublisher-Check")

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })
})
