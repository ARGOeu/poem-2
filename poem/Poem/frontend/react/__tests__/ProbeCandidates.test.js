import React from "react";
import '@testing-library/jest-dom/extend-expect';
import { QueryClient, QueryClientProvider, setLogger } from "react-query";
import { createMemoryHistory } from 'history';
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Route, Router } from "react-router";
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

const mockListProbeCandidates = [
  {
    id: "1",
    name: "some-probe",
    description: "Some description for the test probe",
    docurl: "https://github.com/ARGOeu-Metrics/argo-probe-test",
    rpm: "",
    yum_baseurl: "",
    command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test",
    contact: "poem@example.com",
    status: "testing",
    service_type: "Some service type",
    devel_url: "https://test.argo.grnet.gr/ui/status/test",
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
    command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
    contact: "poem@example.com",
    status: "submitted",
    service_type: "Test service type",
    devel_url: "",
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
  command: "/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2",
  contact: "poem@example.com",
  status: "submitted",
  devel_url: "",
  service_type: "test.service.type",
  created: "2023-05-22 09:59:59",
  last_update: ""
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
  }
]


const renderListView = () => {
  const route = "/ui/administration/probecandidates"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <Router history={ history }>
          <Route
            render={ props => <ProbeCandidateList { ...props } /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


const renderChangeView = () => {
  const route = "/ui/administration/probecandidates/2"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <Router history={ history }>
          <Route
            path="/ui/administration/probecandidates/:id"
            render={ props => <ProbeCandidateChange 
              { ...props } 
              webapitoken="t0k3n"
              webapiservicetypes="https://mock.service.types"
              showtitles={ true }
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


const renderChangeView2 = () => {
  const route = "/ui/administration/probecandidates/3"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <Router history={ history }>
          <Route
            path="/ui/administration/probecandidates/:id"
            render={ props => <ProbeCandidateChange 
              { ...props } 
              webapitoken="t0k3n"
              webapiservicetypes="https://mock.service.types"
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


const renderChangeView3 = () => {
  const route = "/ui/administration/probecandidates/1"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <Router history={ history }>
          <Route
            path="/ui/administration/probecandidates/:id"
            render={ props => <ProbeCandidateChange 
              { ...props } 
              webapitoken="t0k3n"
              webapiservicetypes="https://mock.service.types"
              showtitles={ true }
            /> }
          />
        </Router>
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

            case "/api/v2/internal/probecandidatestatuses":
              return Promise.resolve(mockListStatuses)
          }
        }, 
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject
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
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("test-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("")
    expect(develURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeEnabled()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.getByText("submitted")).toBeEnabled()

    expect(screen.queryByText("Some service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()

    expect(screen.getByText("Test service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Test service type"))
    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).toBeInTheDocument()

    expect(createdField.value).toBe("2023-05-22 09:59:59")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("")
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
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("some-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("https://test.argo.grnet.gr/ui/status/test")
    expect(develURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Some description for the test probe")
    expect(descriptionField).toBeEnabled()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("")
    expect(yumBaseURLField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.getByText("testing")).toBeEnabled()

    expect(screen.queryByText("Test service type")).not.toBeInTheDocument()
    expect(screen.queryByText("Some service type")).toBeInTheDocument()
    expect(screen.queryByText("Meh service type")).not.toBeInTheDocument()

    expect(screen.queryByText("Some service type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("Some service type"))
    expect(screen.queryByText("Test service type")).toBeInTheDocument()
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
    const descriptionField = screen.getByLabelText(/description/i)
    const docURLField = screen.queryByRole("link")
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = screen.getByTestId("yum_baseurl")
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("test-probe")
    expect(nameField).toBeEnabled()

    expect(develURLField.value).toBe("")
    expect(develURLField).toBeEnabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeEnabled()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeEnabled()

    expect(yumBaseURLField.value).toBe("http://repo.example.com/devel/centos7/")
    expect(yumBaseURLField).toBeEnabled()

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeEnabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(screen.getByText("submitted")).toBeEnabled()

    expect(screen.queryByText("some.service.type")).not.toBeInTheDocument()
    expect(screen.queryByText("meh.service.type")).not.toBeInTheDocument()

    expect(screen.getByText("test.service.type")).toBeEnabled()

    selectEvent.openMenu(screen.getByText("test.service.type"))
    expect(screen.queryByText("some.service.type")).toBeInTheDocument()
    expect(screen.queryByText("meh.service.type")).toBeInTheDocument()

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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test"
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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "some.service.type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test"
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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "submitted",
          service_type: "",
          devel_url: ""
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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test"
        }
      )
    })

    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Probe candidate successfully changed", "Changed", 2000
    )
  })

  test("Error in changing probe candidate with message", async () => {
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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Some service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test"
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

  test("Error in changing probe candidate without message", async () => {
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
          command: "/usr/libexec/argo/probes/test/some-probe -H <hostname> -t <timeout> --test",
          contact: "poem@example.com",
          status: "testing",
          service_type: "Test service type",
          devel_url: "https://test.argo.grnet.gr/ui/status/test"
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
})