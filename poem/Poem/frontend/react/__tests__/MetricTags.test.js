import "@testing-library/jest-dom"
import React from "react"
import { MemoryRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MetricTagsComponent, MetricTagsList } from "../MetricTags"
import { Backend } from "../DataManager"
import selectEvent from "react-select-event"
import { NotificationManager } from "react-notifications"
import useEvent from '@testing-library/user-event';


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn()
  }
})

jest.setTimeout(50000)

const mockChangeObject = jest.fn()
const mockDeleteObject = jest.fn()
const mockAddObject = jest.fn()

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
    name: "deprecated",
    metrics: []
  },
  {
    id: "3",
    name: "internal",
    metrics: [
      { "name": "argo.AMSPublisher-Check" }
    ]
  },
  {
    id: "4",
    name: "harmonized",
    metrics: [
      { "name": "generic.certificate.validity" },
      { "name": "generic.http.connect" },
      { "name": "generic.tcp.connect" }
    ]
  },
  {
    id: "2",
    name: "messaging",
    metrics: [
      { "name": "argo.AMS-Check" },  
      { "name": "argo.AMSPublisher-Check" }
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
    id: '1'
  }
}

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

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <MetricTagsList publicView={ true } />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <MetricTagsList />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderChangeView(publicView) {
  const route = `/ui/${publicView ? "public_" : ""}metrictags/harmonized`

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <Routes>
              <Route
                path="/ui/public_metrictags/:name"
                element={ <MetricTagsComponent publicView={ true } /> }
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
                path="/ui/metrictags/:name"
                element={ <MetricTagsComponent /> }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


function renderAddView() {
  const route = "/ui/metrictags/add"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <MetricTagsComponent addview={ true } />
        </MemoryRouter>
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

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(6)
    })

    expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Select metric tag to change")

    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /metrics/i })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText("Search")).toHaveLength(2)

    expect(screen.getAllByRole("row")).toHaveLength(22)
    expect(screen.getByRole("row", { name: /deprecated/i }).textContent).toBe("1deprecatednone")
    expect(screen.getByRole("row", { name: /internal/ }).textContent).toBe("2internalargo.AMSPublisher-Check")
    expect(screen.getByRole("row", { name: /harmonized/i }).textContent).toBe("3harmonizedgeneric.certificate.validitygeneric.http.connectgeneric.tcp.connect")
    expect(screen.getByRole("row", { name: /messaging/i }).textContent).toBe("4messagingargo.AMS-Checkargo.AMSPublisher-Check")

    expect(screen.getByRole("link", { name: /deprecated/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/deprecated")
    expect(screen.getByRole("link", { name: /internal/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/internal")
    expect(screen.getByRole("link", { name: /harmonized/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/harmonized")
    expect(screen.getByRole("link", { name: /messaging/i }).closest("a")).toHaveAttribute("href", "/ui/metrictags/messaging")

    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument()
  })

  test("Test that public page renders properly", async () => {
    renderListView(true)

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(6)
    })

    expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Select metric tag for details")

    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /name/i })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /metrics/i })).toBeInTheDocument()
    expect(screen.getAllByPlaceholderText("Search")).toHaveLength(2)

    expect(screen.getAllByRole("row")).toHaveLength(22)
    expect(screen.getByRole("row", { name: /deprecated/i }).textContent).toBe("1deprecatednone")
    expect(screen.getByRole("row", { name: /internal/ }).textContent).toBe("2internalargo.AMSPublisher-Check")
    expect(screen.getByRole("row", { name: /harmonized/i }).textContent).toBe("3harmonizedgeneric.certificate.validitygeneric.http.connectgeneric.tcp.connect")
    expect(screen.getByRole("row", { name: /messaging/i }).textContent).toBe("4messagingargo.AMS-Checkargo.AMSPublisher-Check")

    expect(screen.getByRole("link", { name: /deprecated/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/deprecated")
    expect(screen.getByRole("link", { name: /internal/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/internal")
    expect(screen.getByRole("link", { name: /harmonized/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/harmonized")
    expect(screen.getByRole("link", { name: /messaging/i }).closest("a")).toHaveAttribute("href", "/ui/public_metrictags/messaging")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})


describe("Test metric tags changeview", () => {
  jest.spyOn(NotificationManager, "success")
  jest.spyOn(NotificationManager, "error")
  jest.spyOn(NotificationManager, "warning")
  jest.spyOn(queryClient, "invalidateQueries")

  beforeEach(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/metrictags/harmonized":
              return Promise.resolve(mockListTags[2])

            case "/api/v2/internal/public_metrictags/harmonized":
              return Promise.resolve(mockListTags[2])

            case "/api/v2/internal/metrictemplates":
              return Promise.resolve(mockMetricTemplates)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Change metric tag")

    expect(screen.getByTestId("form")).toHaveFormValues({
      "name": "harmonized"
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("harmonized")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(3)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")
    expect(table.getByRole("columnheader", { name: /action/i }).textContent).toBe("Actions")

    expect(table.getAllByRole("row")).toHaveLength(5)
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(3)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(3)
    expect(table.getByText("generic.certificate.validity")).toBeInTheDocument()
    expect(table.getByText("generic.http.connect")).toBeInTheDocument()
    expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()

    expect(table.queryByText(/ams/i)).not.toBeInTheDocument()
    selectEvent.openMenu(table.getByText("generic.tcp.connect"))
    expect(table.getAllByText("generic.certificate.validity")).toHaveLength(1)
    expect(table.getAllByText("generic.http.connect")).toHaveLength(1)
    expect(table.getAllByText("generic.tcp.connect")).toHaveLength(1)
    expect(table.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /csv/i })).toBeInTheDocument()
  })

  test("Test filter metrics", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "certificate" } })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getByText("generic.certificate.validity")).toBeInTheDocument()
    expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    expect(table.queryByText("generic.tcp.connect")).not.toBeInTheDocument()
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test that public page renders properly", async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Metric tag details")

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("harmonized")
    expect(nameField).toBeDisabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(2)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")

    expect(table.getAllByRole("row")).toHaveLength(5)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1generic.certificate.validity")
    expect(table.getByRole("row", { name: /2/i }).textContent).toBe("2generic.http.connect")
    expect(table.getByRole("row", { name: /3/i }).textContent).toBe("3generic.tcp.connect")

    expect(table.queryByTestId(/remove-/i)).not.toBeInTheDocument()
    expect(table.queryByTestId(/insert-/i)).not.toBeInTheDocument()

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test filter metrics in public changeview", async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByTestId("name")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "certificate" } })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1generic.certificate.validity")

    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test change metric tags name", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveFormValues({name: "test_tag"})
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "test_tag", metrics: ["generic.certificate.validity", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test change metric tags name in filtered view", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "connect" } })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveFormValues({name: "test_tag"})
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "test_tag", metrics: ["generic.certificate.validity", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test error changing metric tag with error message", async () => {
    mockChangeObject.mockImplementationOnce(() => {
      throw Error("400 BAD REQUEST: Metric tag with this name already exists.")
    })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveFormValues({name: "test_tag"})
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "test_tag", metrics: ["generic.certificate.validity", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Metric tag with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error changing metric tag without error message", async () => {
    mockChangeObject.mockImplementationOnce(() => { throw Error() })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveFormValues({name: "test_tag"})
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "test_tag", metrics: ["generic.certificate.validity", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric tag</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test change metrics for metric tag", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      selectEvent.select(screen.getByText("generic.certificate.validity"), "argo.AMS-Check")
    }) 

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["argo.AMS-Check", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test change metrics for metric tag in filtered view", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "connect" } })

    await selectEvent.select(screen.getByText("generic.http.connect"), "argo.AMS-Check")

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["generic.certificate.validity", "argo.AMS-Check", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test delete metrics from metric tag", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("remove-1"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["generic.certificate.validity", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test delete metrics from metric tag if filtered view", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "connect" } })

    fireEvent.click(screen.getByTestId("remove-0"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["generic.certificate.validity", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test insert new metrics for metric tag", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("insert-0"))

    const table = within(screen.getByRole("table"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "argo.AMSPublisher-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText("Must be one of predefined metrics")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["generic.certificate.validity", "argo.AMSPublisher-Check", "generic.http.connect", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test insert new metrics for metric tag in filtered view", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "connect" } })

    fireEvent.click(screen.getByTestId("insert-0"))

    const table = within(screen.getByRole("table"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "argo.AMSPublisher-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText("Must be one of predefined metrics")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["generic.certificate.validity", "generic.http.connect", "argo.AMSPublisher-Check", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
  })

  test("Test import csv successfully", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /csv/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /import/i }))

    const csv = 'name\r\nargo.AMS-Check\r\nargo.AMSPublisher-Check\r\n';

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "harmonized.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => { 
      useEvent.upload(input, file) 
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("harmonized")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(3)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")
    expect(table.getByRole("columnheader", { name: /action/i }).textContent).toBe("Actions")

    await waitFor(() => {
      expect(table.getAllByRole("row")).toHaveLength(4)
    })
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(2)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(2)

    expect(table.queryByText("generic.certificate.validity")).not.toBeInTheDocument()
    expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    expect(table.queryByText("generic.tcp.connect")).not.toBeInTheDocument()

    expect(table.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()

    selectEvent.openMenu(table.getByText("argo.AMS-Check"))
    expect(table.getAllByText("generic.certificate.validity")).toHaveLength(1)
    expect(table.getAllByText("generic.http.connect")).toHaveLength(1)
    expect(table.getAllByText("generic.tcp.connect")).toHaveLength(1)
    expect(table.getAllByText("argo.AMS-Check")).toHaveLength(1)
    expect(table.getAllByText("argo.AMSPublisher-Check")).toHaveLength(1)

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test import csv with nonexisting metrics", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /csv/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /import/i }))

    const csv = 'name\r\nargo.AMS-Check\r\nargo.AMSPublisher-Check\r\nmock.metric.name\r\n';

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "harmonized.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => { 
      useEvent.upload(input, file) 
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("harmonized")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(3)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")
    expect(table.getByRole("columnheader", { name: /action/i }).textContent).toBe("Actions")

    await waitFor(() => {
      expect(table.getAllByRole("row")).toHaveLength(5)
    })
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(3)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(3)

    expect(table.queryByText("generic.certificate.validity")).not.toBeInTheDocument()
    expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    expect(table.queryByText("generic.tcp.connect")).not.toBeInTheDocument()

    expect(table.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()
    expect(table.getByText("mock.metric.name")).toBeInTheDocument()

    selectEvent.openMenu(table.getByText("argo.AMS-Check"))
    expect(table.getAllByText("generic.certificate.validity")).toHaveLength(1)
    expect(table.getAllByText("generic.http.connect")).toHaveLength(1)
    expect(table.getAllByText("generic.tcp.connect")).toHaveLength(1)
    expect(table.getAllByText("argo.AMS-Check")).toHaveLength(1)
    expect(table.getAllByText("argo.AMSPublisher-Check")).toHaveLength(1)

    await waitFor(() => {
      expect(screen.queryByText('Must be one of predefined metrics')).toBeInTheDocument()
    })

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
  })

  test("Test export csv successfully", async () => {
    const helpers = require("../FileDownload")
    jest.spyOn(helpers, "downloadCSV").mockReturnValueOnce(null)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /csv/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }))

    const content = "name\r\ngeneric.certificate.validity\r\ngeneric.http.connect\r\ngeneric.tcp.connect"

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1)
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, "harmonized.csv")
  })

  test("Export csv when form has been changed", async () => {
    const helpers = require("../FileDownload")
    jest.spyOn(helpers, "downloadCSV").mockReturnValueOnce(null)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      selectEvent.select(screen.getByText("generic.certificate.validity"), "argo.AMS-Check")
    }) 

    await waitFor(() => {
      expect(screen.getByText("argo.AMS-Check")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("remove-1"))

    fireEvent.click(screen.getByTestId("insert-0"))

    const table = within(screen.getByRole("table"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "argo.AMSPublisher-Check")
    })

    await waitFor(() => {
      expect(screen.queryByText("Must be one of predefined metrics")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /csv/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }))

    const content = "name\r\nargo.AMS-Check\r\nargo.AMSPublisher-Check\r\ngeneric.tcp.connect"

    expect(helpers.downloadCSV).toHaveBeenCalledTimes(1)
    expect(helpers.downloadCSV).toHaveBeenCalledWith(content, "harmonized.csv")
  })

  test("Test display warning messages", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: "CREATED",
        detail: "Metric argo.AMSPublisher-Check does not exist."
      })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      selectEvent.select(screen.getByText("generic.certificate.validity"), "argo.AMS-Check")
    })

    await waitFor(() => {
      expect(screen.getByText("argo.AMS-Check")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("remove-1"))

    fireEvent.click(screen.getByTestId("insert-0"))

    const table = within(screen.getByRole("table"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "argo.AMSPublisher-Check")
    })

    await waitFor(() => {
      expect(screen.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["argo.AMS-Check", "argo.AMSPublisher-Check", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMSPublisher-Check does not exist.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
  })

  test("Test display multiple warning messages", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: "CREATED",
        detail: "Error syncing metric tags\nMetric argo.AMSPublisher-Check does not exist."
      })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await selectEvent.select(screen.getByText("generic.certificate.validity"), "argo.AMS-Check")

    await waitFor(() => {
      expect(screen.getByText("argo.AMS-Check")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("remove-1"))

    fireEvent.click(screen.getByTestId("insert-0"))

    const table = within(screen.getByRole("table"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "argo.AMSPublisher-Check")
    })

    await waitFor(() => {
      expect(screen.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText("Must be one of predefined metrics")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { id: "4", name: "harmonized", metrics: ["argo.AMS-Check", "argo.AMSPublisher-Check", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully changed", "Changed", 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric argo.AMSPublisher-Check does not exist.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )

    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Error syncing metric tags</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
  })

  test("Test delete metric tag", async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: "NO CONTENT" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/harmonized"
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully deleted", "Deleted", 2000
    )
  })

  test("Test delete metric tag if changed name", async () => {
    mockDeleteObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, statusText: "NO CONTENT" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/harmonized"
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully deleted", "Deleted", 2000
    )
  })

  test("Test error deleting metric tag with message", async () => {
    mockDeleteObject.mockImplementationOnce( () => {
      throw Error("400 BAD REQUEST: There has been an error.")
    })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/harmonized"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error deleting metric tag without message", async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() } )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/harmonized"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting metric tag</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })
})


describe("Test metric tags addview", () => {
  jest.spyOn(NotificationManager, "success")
  jest.spyOn(NotificationManager, "error")
  jest.spyOn(NotificationManager, "warning")
  jest.spyOn(queryClient, "invalidateQueries")

  beforeEach(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/metrictemplates":
              return Promise.resolve(mockMetricTemplates)
          }
        },
        isActiveSession: () => Promise.resolve(mockActiveSession),
        addObject: mockAddObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Add metric tag")

    expect(screen.getByTestId("form")).toHaveFormValues({
      "name": ""
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(3)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")
    expect(table.getByRole("columnheader", { name: /action/i }).textContent).toBe("Actions")

    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)
    const row1 = table.getAllByRole("row")[2]
    const input = within(row1).getByRole("combobox")
    expect(input).toBeInTheDocument()

    expect(table.queryByText(/generic/i)).not.toBeInTheDocument()
    expect(table.queryByText(/argo/i)).not.toBeInTheDocument()
    expect(table.queryByText("generic.certificate.validity")).not.toBeInTheDocument()
    expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    expect(table.queryByText("generic.tcp.connect")).not.toBeInTheDocument()
    expect(table.queryByText("argo.AMS-Check")).not.toBeInTheDocument()
    expect(table.queryByText("argo.AMSPublisher-Check")).not.toBeInTheDocument()
    selectEvent.openMenu(input)
    expect(table.getByText("generic.certificate.validity")).toBeInTheDocument()
    expect(table.getByText("generic.http.connect")).toBeInTheDocument()
    expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    expect(table.getByText("argo.AMS-Check")).toBeInTheDocument()
    expect(table.getByText("argo.AMSPublisher-Check")).toBeInTheDocument()

    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /clone/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /csv/i })).toBeInTheDocument()
  })

  test("Test change metric tags name", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    await waitFor(() => {
      expect(screen.getByTestId("form")).toHaveFormValues({name: "test_tag"})
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: [] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
  })

  test("Test change metrics for metric tag", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    const table = within(screen.getByRole("table"))

    fireEvent.click(table.getByTestId("remove-0"))

    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)

    const row1 = table.getAllByRole("row")[2]
    const input1 = within(row1).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input1, "generic.certificate.validity")
    })

    await waitFor(() => {
      expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("insert-0"))

    const row2 = table.getAllByRole("row")[3]
    const input2 = within(row2).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input2, "generic.http.connect")
    })
    
    await waitFor(() => {
      expect(table.queryByText("generic.tcp.connect")).not.toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("insert-1"))

    const row3 = table.getAllByRole("row")[4]
    const input3 = within(row3).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input3, "generic.tcp.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("remove-1"))

    await waitFor(() => {
      expect(table.queryByText("generic.http.connect")).not.toBeInTheDocument()
    })

    await selectEvent.select(table.getByText("generic.tcp.connect"), "argo.AMS-Check")

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: ["generic.certificate.validity", "argo.AMS-Check"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
  })

  test("Test import csv successfully", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const csv = 'name\r\nargo.AMS-Check\r\nargo.AMSPublisher-Check\r\n';

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "harmonized.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => { 
      useEvent.upload(input, file) 
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: ["argo.AMS-Check", "argo.AMSPublisher-Check"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
  })

  test("Test import csv, make some changes, and save", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 201, statusText: "CREATED" })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    const csv = 'name\r\nargo.AMS-Check\r\nargo.AMSPublisher-Check\r\n';

    const content = new Blob([csv], { type: "text/csv;charset=UTF-8" })
    const file = new File([content], "harmonized.csv", { type: "text/csv;charset=UTF-8" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => { 
      useEvent.upload(input, file) 
    })

    await waitFor(() => {
      expect(input.files[0]).toStrictEqual(file)
    })
    expect(input.files.item(0)).toStrictEqual(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    const table = within(screen.getByRole("table"))

    fireEvent.click(table.getByTestId("insert-1"))

    const row3 = table.getAllByRole("row")[4]
    const input3 = within(row3).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input3, "generic.tcp.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("remove-1"))

    await waitFor(() => {
      expect(table.queryByText("argo.AMSPublisher-Check")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: ["argo.AMS-Check", "generic.tcp.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
  })

  test("Test display warning messages", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: "CREATED",
        detail: "Metric generic.tcp.connect does not exist."
      })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    const table = within(screen.getByRole("table"))

    const row1 = table.getAllByRole("row")[2]
    const input1 = within(row1).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input1, "generic.tcp.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("insert-0"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "generic.http.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.http.connect")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: ["generic.tcp.connect", "generic.http.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric generic.tcp.connect does not exist.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
  })

  test("Test display multiple warning messages", async () => {
    mockAddObject.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        status: 201,
        statusText: "CREATED",
        detail: "Error syncing metric tags\nMetric generic.tcp.connect does not exist."
      })
    )

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    const table = within(screen.getByRole("table"))

    const row1 = table.getAllByRole("row")[2]
    const input1 = within(row1).getByRole("combobox")

    await waitFor(() => {
      selectEvent.select(input1, "generic.tcp.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.tcp.connect")).toBeInTheDocument()
    })

    fireEvent.click(table.getByTestId("insert-0"))

    const row2 = table.getAllByRole("row")[3]

    await waitFor(() => {
      selectEvent.select(within(row2).getByRole("combobox"), "generic.http.connect")
    })

    await waitFor(() => {
      expect(table.getByText("generic.http.connect")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: ["generic.tcp.connect", "generic.http.connect"] }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metrictemplate")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictags")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metric")
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("public_metrictemplate")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric tag successfully added", "Added", 2000
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Metric generic.tcp.connect does not exist.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Error syncing metric tags</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
  })

  test("Test error adding metric tag with error message", async () => {
    mockAddObject.mockImplementationOnce(() => {
      throw Error("400 BAD REQUEST: Metric tag with this name already exists.")
    })

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: [] }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Metric tag with this name already exists.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error adding metric tag without error message", async () => {
    mockAddObject.mockImplementationOnce(() => { throw Error() })

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "test_tag" } })

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metrictags/",
        { name: "test_tag", metrics: [] }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding metric tag</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })
})