import React from "react";
import '@testing-library/jest-dom/extend-expect';
import { QueryClient, QueryClientProvider, setLogger } from "react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProbeCandidateChange, ProbeCandidateList } from "../ProbeCandidates";
import { Backend, WebApi } from "../DataManager";
import selectEvent from "react-select-event";
import { NotificationManager } from "react-notifications";


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn(), 
    WebApi: jest.fn()
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

const mockChangeObject = jest.fn()
const mockDeleteObject = jest.fn()

const mockListProbeCandidates = [
  {
    id: "1",
    name: "some-probe",
    description: "Some description for the test probe",
    docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
    rpm: "",
    yum_baseurl: "",
    script: "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test-probe.py",
    command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test",
    contact: "poem@example.com",
    status: "testing",
    service_type: "Some service type",
    devel_url: "https://test.argo.grnet.gr/ui/status/test",
    production_url: "",
    rejection_reason: "",
    created: "2023-05-22 09:55:48",
    last_update: "2023-05-22 10:00:23"
  },
  {
    id: "2",
    name: "test-probe",
    description: "Description of the probe",
    docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
    rpm: "argo-probe-test-0.1.0-1.el7.noarch.rpm",
    yum_baseurl: "http://repo.example.com/devel/centos7/",
    script: "",
    command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
    contact: "poem@example.com",
    status: "submitted",
    service_type: "Test service type",
    devel_url: "",
    production_url: "",
    rejection_reason: "",
    created: "2023-05-22 09:59:59",
    last_update: ""
  }
]

const mockProbeCandidateServiceTypeName = {
  id: "3",
  name: "test-probe",
  description: "Description of the probe",
  docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
  rpm: "argo-probe-test-0.1.0-1.el7.noarch.rpm",
  yum_baseurl: "http://repo.example.com/devel/centos7/",
  script: "",
  command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
  contact: "poem@example.com",
  status: "submitted",
  devel_url: "",
  production_url: "",
  rejection_reason: "",
  service_type: "test.service.type",
  created: "2023-05-22 09:59:59",
  last_update: ""
}

const mockDeployedProbeCandidate = {
  id: "4",
  name: "deployed-probe",
  description: "Description of the probe",
  docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
  rpm: "argo-probe-test-0.1.0-1.el7.noarch.rpm",
  yum_baseurl: "http://repo.example.com/devel/centos7/",
  script: "",
  command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
  contact: "poem@example.com",
  status: "deployed",
  devel_url: "https://test.argo.grnet.gr/ui/status/test",
  production_url: "https://production.argo.grnet.gr/ui/status/prod",
  rejection_reason: "",
  service_type: "Production service type",
  created: "2023-05-22 09:55:48",
  last_update: "2023-05-22 10:00:23"
}

const mockRejectedProbeCandidate = {
  id: "5",
  name: "rejected-probe",
  description: "Description of the bad probe",
  docurl: "https://github.com/ARGOeu-Metrics/argo-probe-bad",
  rpm: "argo-probe-bad-0.1.0-1.el7.noarch.rpm",
  yum_baseurl: "http://repo.example.com/devel/centos7/",
  script: "",
  command: "/usr/libexec/argo/probes/test/bad-probe -H <hostname> -t <timeout> --faulty-test",
  contact: "bad@example.com",
  status: "rejected",
  devel_url: "https://test.argo.grnet.gr/ui/status/test",
  production_url: "",
  rejection_reason: "Probe is not working",
  service_type: "Production service type",
  created: "2023-08-07 11:52:49",
  last_update: "2023-08-07 12:10:48"
}

const mockListStatuses = [
  "deployed",
  "rejected",
  "submitted",
  "testing"
]

const mockActiveSession = {
  active: true,
  userdetails: {
    is_superuser: true,
    username: 'poem',
    groups: {
      aggregations: ['EGI'],
      metricprofiles: ['EGI'],
      metrics: ['EGI', 'ARGOTEST'],
      thresholdsprofiles: ['EGI']
    },
    token: '1234token'
  }
}

const mockServiceTypes = [
  {
    name: "meh.service.type",
    title: "Meh service type",
    description: "Meh service type description",
    tags: ["poem"]
  }, {
    name: "some.service.type",
    title: "Some service type",
    description: "Some service type description",
    tags: ["poem"]
  }, {
    name: "test.service.type",
    title: "Test service type",
    description: "Test service type description",
    tags: ["topology"]
  }, {
    name: "production.service.type",
    title: "Production service type",
    description: "Production service type description",
    tags: ["topology"]
  }
]


const renderListView = () => {
  const route = "/ui/administration/probecandidates"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <ProbeCandidateList />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const renderChangeView = () => {
  const route = "/ui/administration/probecandidates/2"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/probecandidates/:id"
              element={ 
                <ProbeCandidateChange 
                  webapitoken="t0k3n"
                  webapiservicetypes="https://mock.service.types"
                  showtitles={ true }
                /> 
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const renderChangeView2 = () => {
  const route = "/ui/administration/probecandidates/3"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/probecandidates/:id"
              element={ 
                <ProbeCandidateChange 
                  webapitoken="t0k3n"
                  webapiservicetypes="https://mock.service.types"
                /> 
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const renderChangeView3 = () => {
  const route = "/ui/administration/probecandidates/1"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/probecandidates/:id"
              element={ 
                <ProbeCandidateChange 
                  webapitoken="t0k3n"
                  webapiservicetypes="https://mock.service.types"
                  showtitles={ true }
                /> 
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const renderChangeView4 = () => {
  const route = "/ui/administration/probecandidates/4"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/probecandidates/:id"
              element={ 
                <ProbeCandidateChange 
                  webapitoken="t0k3n"
                  webapiservicetypes="https://mock.service.types"
                  showtitles={ true }
                /> 
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const renderChangeView5 = () => {
  const route = "/ui/administration/probecandidates/5"

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/probecandidates/:id"
              element={ 
                <ProbeCandidateChange 
                  webapitoken="t0k3n"
                  webapiservicetypes="https://mock.service.types"
                  showtitles={ true }
                /> 
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe("Test list of probe candidates", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/probecandidates":
              return Promise.resolve(mockListProbeCandidates)

            case "/api/v2/internal/probecandidatestatuses":
              return Promise.resolve(mockListStatuses)
          }
        }, 
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Select probe candidate to change")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(10)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("2test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })

  test("Test filtering", async () => {
    renderListView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    const searchName = screen.getAllByPlaceholderText("Search")[0]
    const searchDescription = screen.getAllByPlaceholderText("Search")[1]
    const searchCreated = screen.getAllByPlaceholderText("Search")[2]
    const selectStatus = screen.getByDisplayValue("Show all")

    fireEvent.change(searchName, { target: { value: "test" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("1test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    fireEvent.change(searchName, { target: { value: "" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("2test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    fireEvent.change(searchDescription, { target: { value: "test" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")

    fireEvent.change(searchDescription, { target: { value: "" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("2test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    fireEvent.change(searchCreated, { target: { value: "09:55" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")

    fireEvent.change(searchCreated, { target: { value: "" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("2test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    fireEvent.change(selectStatus, { target: { value: "testing" } })

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
  })
})


describe("Test list of probe candidates if empty", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/probecandidates":
              return Promise.resolve([])

            case "/api/v2/internal/probecandidatestatuses":
              return Promise.resolve(mockListStatuses)
          }
        }, 
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test("Test that page renders properly if empty response", async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Select probe candidate to change")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(10)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(12)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /no/i }).textContent).toBe("No probe candidates")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})


describe("Test probe candidate changeview", () => {
  jest.spyOn(NotificationManager, "success")
  jest.spyOn(NotificationManager, "error")
  jest.spyOn(NotificationManager, "warning")

  beforeEach(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/probecandidates/1":
              return Promise.resolve(mockListProbeCandidates[0])

            case "/api/v2/internal/probecandidates/2":
              return Promise.resolve(mockListProbeCandidates[1])
            
            case "/api/v2/internal/probecandidates/3":
              return Promise.resolve(mockProbeCandidateServiceTypeName)
 
            case "/api/v2/internal/probecandidates/4":
              return Promise.resolve(mockDeployedProbeCandidate)

            case "/api/v2/internal/probecandidates/5":
              return Promise.resolve(mockRejectedProbeCandidate)

            case "/api/v2/internal/probecandidatestatuses":
              return Promise.resolve(mockListStatuses)
          }
        }, 
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
    WebApi.mockImplementation(() => {
      return {
        fetchServiceTypes: () => Promise.resolve(mockServiceTypes)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Change probe candidate")
    })

    const nameField = screen.getByTestId("name")
    const descriptionField = screen.getByLabelText(/description/i)
    const develURLField = screen.getByTestId("devel_url")
    const prodURLField = screen.getByTestId("production_url")
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const scriptField = screen.getByTestId("script")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("test-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("")
    expect(develURLField).toBeEnabled()

    expect(prodURLField.value).toBe("")
    expect(prodURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeEnabled()

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(scriptField.value).toBe("")
    expect(scriptField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.queryByText("deployed")).not.toBeInTheDocument()
    expect(screen.queryByText("rejected")).not.toBeInTheDocument()
    expect(screen.queryByText("testing")).not.toBeInTheDocument()

    expect(screen.getByText("submitted")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("submitted"))
    expect(screen.queryByText("deployed")).toBeInTheDocument()
    expect(screen.queryByText("rejected")).toBeInTheDocument()
    expect(screen.queryByText("testing")).toBeInTheDocument()

    expect(screen.queryByText("Some service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Production service type")).not.toBeInTheDocument()

    expect(screen.getByText("Test service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Test service type"))
    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).toBeInTheDocument()
    expect(screen.queryByText("Production service type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-05-22 09:59:59")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test("Test that page renders properly if candidate rejected", async () => {
    renderChangeView5()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Change probe candidate")
    })

    const nameField = screen.getByTestId("name")
    const descriptionField = screen.getByLabelText(/description/i)
    const rejectedField = screen.getByLabelText(/rejection/i)
    const develURLField = screen.getByTestId("devel_url")
    const prodURLField = screen.getByTestId("production_url")
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const scriptField = screen.getByTestId("script")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("rejected-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("https://test.argo.grnet.gr/ui/status/test")
    expect(develURLField).toBeEnabled()

    expect(prodURLField.value).toBe("")
    expect(prodURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the bad probe")
    expect(descriptionField).toBeEnabled()

    expect(rejectedField.value).toBe("Probe is not working")
    expect(rejectedField).toBeEnabled()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-bad")

    expect(rpmField.value).toBe("argo-probe-bad-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(scriptField.value).toBe("")
    expect(scriptField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/bad-probe -H <hostname> -t <timeout> --faulty-test")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("bad@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.queryByText("deployed")).not.toBeInTheDocument()
    expect(screen.queryByText("submitted")).not.toBeInTheDocument()
    expect(screen.queryByText("testing")).not.toBeInTheDocument()

    expect(screen.getByText("rejected")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("rejected"))
    expect(screen.queryByText("deployed")).toBeInTheDocument()
    expect(screen.queryByText("submitted")).toBeInTheDocument()
    expect(screen.queryByText("testing")).toBeInTheDocument()

    expect(screen.queryByText("Some service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Test service type")).not.toBeInTheDocument()

    expect(screen.getByText("Production service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Production service type"))
    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).toBeInTheDocument()
    expect(screen.queryByText("Test service type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-08-07 11:52:49")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("2023-08-07 12:10:48")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test("Test that page renders properly if candidate with devel URL", async () => {
    renderChangeView3()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Change probe candidate")
    })

    const nameField = screen.getByTestId("name")
    const descriptionField = screen.getByLabelText(/description/i)
    const develURLField = screen.getByTestId("devel_url")
    const prodURLField = screen.getByTestId("production_url")
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const scriptField = screen.getByTestId("script")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("some-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("https://test.argo.grnet.gr/ui/status/test")
    expect(develURLField).toBeEnabled()

    expect(prodURLField.value).toBe("")
    expect(prodURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Some description for the test probe")
    expect(descriptionField).toBeEnabled()

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("")
    expect(yumBaseURLField).toBeEnabled()

    expect(scriptField.value).toBe("https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test-probe.py")
    expect(scriptField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.queryByText("deployed")).not.toBeInTheDocument()
    expect(screen.queryByText("rejected")).not.toBeInTheDocument()
    expect(screen.queryByText("submitted")).not.toBeInTheDocument()

    expect(screen.getByText("testing")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("testing"))
    expect(screen.queryByText("deployed")).toBeInTheDocument()
    expect(screen.queryByText("rejected")).toBeInTheDocument()
    expect(screen.queryByText("submitted")).toBeInTheDocument()

    expect(screen.queryByText("Test service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Production service type")).not.toBeInTheDocument()

    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Some service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Some service type"))
    expect(screen.queryByText("Test service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).toBeInTheDocument()
    expect(screen.queryByText("Production service type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-05-22 09:55:48")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("2023-05-22 10:00:23")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test("Test that page renders properly if candidate with production URL", async () => {
    renderChangeView4()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Change probe candidate")
    })

    const nameField = screen.getByTestId("name")
    const descriptionField = screen.getByLabelText(/description/i)
    const develURLField = screen.getByTestId("devel_url")
    const prodURLField = screen.getByTestId("production_url")
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const scriptField = screen.getByTestId("script")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("deployed-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("https://test.argo.grnet.gr/ui/status/test")
    expect(develURLField).toBeEnabled()

    expect(prodURLField.value).toBe("https://production.argo.grnet.gr/ui/status/prod")
    expect(prodURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeEnabled()

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(scriptField.value).toBe("")
    expect(scriptField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.queryByText("rejected")).not.toBeInTheDocument()
    expect(screen.queryByText("submitted")).not.toBeInTheDocument()
    expect(screen.queryByText("testing")).not.toBeInTheDocument()

    expect(screen.getByText("deployed")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("deployed"))
    expect(screen.queryByText("rejected")).toBeInTheDocument()
    expect(screen.queryByText("submitted")).toBeInTheDocument()
    expect(screen.queryByText("testing")).toBeInTheDocument()

    expect(screen.queryByText("Test service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Some service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()

    expect(screen.queryByText("Production service type")).toBeInTheDocument()
    expect(screen.queryByText("Production service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Production service type"))
    expect(screen.queryByText("Test service type")).toBeInTheDocument()
    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-05-22 09:55:48")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("2023-05-22 10:00:23")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test("Test that page renders properly if service types without titles", async () => {
    renderChangeView2()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i }).textContent).toBe("Change probe candidate")
    })

    const nameField = screen.getByTestId("name")
    const develURLField = screen.getByTestId("devel_url")
    const prodURLField = screen.getByTestId("production_url")
    const descriptionField = screen.getByLabelText(/description/i)
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const scriptField = screen.getByTestId("script")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("test-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("")
    expect(develURLField).toBeEnabled()

    expect(prodURLField.value).toBe("")
    expect(prodURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeEnabled()

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(scriptField.value).toBe("")
    expect(scriptField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.queryByText("deployed")).not.toBeInTheDocument()
    expect(screen.queryByText("rejected")).not.toBeInTheDocument()
    expect(screen.queryByText("testing")).not.toBeInTheDocument()

    expect(screen.getByText("submitted")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("submitted"))
    expect(screen.queryByText("deployed")).toBeInTheDocument()
    expect(screen.queryByText("rejected")).toBeInTheDocument()
    expect(screen.queryByText("testing")).toBeInTheDocument()

    expect(screen.queryByText("some.service.type")).not.toBeInTheDocument()
    expect(screen.queryByText("meh.service.type")).not.toBeInTheDocument()
    expect(screen.queryByText("production.service.type")).not.toBeInTheDocument()

    expect(screen.getByText("test.service.type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("test.service.type"))
    expect(screen.queryByText("some.service.type")).toBeInTheDocument()
    expect(screen.queryByText("meh.service.type")).toBeInTheDocument()
    expect(screen.queryByText("production.service.type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-05-22 09:59:59")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })

  test("Test successfully changing probe candidate", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("script"), { target: { value: "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test.pl" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.select(screen.getByText("Test service type"), "Some service type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test.pl",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test successfully changing probe candidate status to deployed", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView3()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "prod-probe" } })

    fireEvent.change(screen.getByTestId("production_url"), { target: { value: "https://production.argo.grnet.gr/ui/status/new" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --flag" } })

    await selectEvent.select(screen.getByText("testing"), "deployed")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "1",
          name: "prod-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "",
          yum_baseurl: "",
          script: "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test-probe.py",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --flag",
          contact: "poem@example.com",
          status: "deployed",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "https://production.argo.grnet.gr/ui/status/new",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate if invalid prod URL and not required", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Production UI URL is required")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByTestId("production_url"), { target: { value: "production.argo.grnet.gr/ui/status/new" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.select(screen.getByText("Test service type"), "Some service type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Invalid URL")).toBeInTheDocument()
    expect(screen.queryByText("Production UI URL is required")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("production_url"), { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate with missing production URL", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView3()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "prod-probe" } })


    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --flag" } })

    await selectEvent.select(screen.getByText("testing"), "deployed")

    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Production UI URL is required")).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Production UI URL is required")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId("production_url"), { target: { value: "https://production.argo.grnet.gr/ui/status/new" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "1",
          name: "prod-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "",
          yum_baseurl: "",
          script: "https://github.com/ARGOeu-Metrics/argo-probe-test/exec/test-probe.py",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --flag",
          contact: "poem@example.com",
          status: "deployed",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "https://production.argo.grnet.gr/ui/status/new",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test successfully changing probe candidate if service types have no titles", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView2()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.select(screen.getByText("test.service.type"), "some.service.type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "3",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "some.service.type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test successfully changing probe candidate without service type", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.clearAll(screen.getByText("Test service type"))

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "submitted",
          service_type: "",
          devel_url: "",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate without service type", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.clearAll(screen.getByText("Test service type"))

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })

    expect(screen.queryByText("Service type is required")).toBeInTheDocument()

    await selectEvent.select(screen.getByText("Select..."), "Test service type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate if invalid devel URL", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.select(screen.getByText("Test service type"), "Some service type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Invalid URL")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate if invalid devel URL and URL not required", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Invalid URL")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "submitted",
          service_type: "Test service type",
          devel_url: "",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test validation error when changing probe candidate if URL required", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Devel UI URL is required")).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Invalid URL")).not.toBeInTheDocument()
    expect(screen.queryByText("Devel UI URL is required")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test successfully changing probe candidate to rejected", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText("submitted"), "rejected")

    await waitFor(() => {
      expect(screen.queryByLabelText(/rejection/)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/rejection/i), { target: { value: "Probe is not working properly" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "test-probe",
          description: "Description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.0-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/centos7/",
          script: "",
          command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
          contact: "poem@example.com",
          status: "rejected",
          service_type: "Test service type",
          devel_url: "",
          production_url: "",
          rejection_reason: "Probe is not working properly"
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test changing probe candidate to rejected with validation error", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200, statusText: "OK" })
    )

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    expect(screen.queryByLabelText(/rejection/)).not.toBeInTheDocument()

    await selectEvent.select(screen.getByText("submitted"), "rejected")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { title: "change" })).not.toBeInTheDocument()
    })

    expect(screen.getByText("Rejection reason is required")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/rejection/i), { target: { value: "Probe is not working properly" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "test-probe",
          description: "Description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.0-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/centos7/",
          script: "",
          command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
          contact: "poem@example.com",
          status: "rejected",
          service_type: "Test service type",
          devel_url: "",
          production_url: "",
          rejection_reason: "Probe is not working properly"
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Test error in changing probe candidate with message", async () => {
    mockChangeObject.mockImplementationOnce(() => {
      throw Error("400 BAD REQUEST; There has been an error")
    })
    
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    await selectEvent.select(screen.getByText("Test service type"), "Some service type")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST; There has been an error</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error in changing probe candidate without message", async () => {
    mockChangeObject.mockImplementationOnce(() => {
      throw Error()
    })
    
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing probe candidate</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error in changing probe candidate with warning", async () => {
    mockChangeObject.mockReturnValueOnce(
      Promise.resolve({
        warning: "Probe candidate has been successfully modified, but the email was not sent: SMTP error"
      })
    )
    
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /candidate/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "some-probe" } })

    fireEvent.change(screen.getByTestId("devel_url"), { target: { value: "https://test.argo.grnet.gr/ui/status/test" } })

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "More elaborate description of the probe" } })

    fireEvent.change(screen.getByTestId("rpm"), { target: { value: "argo-probe-test-0.1.1-1.el7.noarch.rpm" } })

    fireEvent.change(screen.getByTestId("yum_baseurl"), { target: { value: "http://repo.example.com/devel/rocky8/" } })

    fireEvent.change(screen.getByTestId("command"), { target: { value: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test" } })

    await selectEvent.select(screen.getByText("submitted"), "testing")

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "change" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/",
        {
          id: "2",
          name: "some-probe",
          description: "More elaborate description of the probe",
          docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
          rpm: "argo-probe-test-0.1.1-1.el7.noarch.rpm",
          yum_baseurl: "http://repo.example.com/devel/rocky8/",
          script: "",
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test",
          production_url: "",
          rejection_reason: ""
        }
      )
    })

    expect(NotificationManager.success).not.toHaveBeenCalled()
    expect(NotificationManager.error).not.toHaveBeenCalled()
    expect(NotificationManager.warning).toHaveBeenCalledWith(
      <div>
        <p>Probe candidate has been successfully modified, but the email was not sent: SMTP error</p>
        <p>Click to dismiss.</p>
      </div>,
      "Warning",
      0,
      expect.any(Function)
    )
  })

  test("Test successfully deleting probe candidate", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /change probe/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "delete" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/2"
        )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully deleted", "Deleted", 2000
    )
  })

  test("Test error deleting probe candidate with message", async () => {
    mockDeleteObject.mockImplementationOnce(() => {
      throw Error("404 NOT FOUND; Probe candidate not found")
    })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /change probe/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "delete" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/2"
        )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>404 NOT FOUND; Probe candidate not found</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error deleting probe candidate without message", async () => {
    mockDeleteObject.mockImplementationOnce(() => { throw Error() })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /change probe/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole("dialog", { title: "delete" })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: /yes/i }))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/probecandidates/2"
        )
    })

    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting probe candidate</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })
})