import React from "react";
import '@testing-library/jest-dom/extend-expect';
import { QueryClient, QueryClientProvider, setLogger } from "react-query";
import { createMemoryHistory } from 'history';
import { render, screen, waitFor } from "@testing-library/react";
import { Route, Router } from "react-router";
import { ProbeCandidateChange, ProbeCandidateList } from "../ProbeCandidates";
import { Backend } from "../DataManager";


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
    created: "2023-05-22 09:59:59",
    last_update: ""
  }
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
            render={ props => <ProbeCandidateChange { ...props } /> }
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
        fetchData: () => Promise.resolve(mockListProbeCandidates),
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

    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(11)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /some-probe/i }).textContent).toBe("1some-probeSome description for the test probe2023-05-22 09:55:48testing")
    expect(screen.getByRole("row", { name: /test-probe/i }).textContent).toBe("2test-probeDescription of the probe2023-05-22 09:59:59submitted")
    expect(screen.getByRole("link", { name: /some-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/1")
    expect(screen.getByRole("link", { name: /test-probe/i }).closest("a")).toHaveAttribute("href", "/ui/administration/probecandidates/2")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})


describe("Test list of probe candidates if empty", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve([]),
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

    expect(screen.getAllByRole("columnheader")).toHaveLength(5)
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Description" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Created" })).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(11)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(9)
    expect(screen.getByRole("row", { name: /no/i }).textContent).toBe("No probe candidates")

    expect(screen.queryByRole("button", { name: /add/i })).not.toBeInTheDocument()
  })
})


describe("Test probe candidate changeview", () => {
  beforeEach(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockListProbeCandidates[1]),
        isActiveSession: () => Promise.resolve(mockActiveSession)
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
    const statusField = screen.getByTestId("status")
    const descriptionField = screen.getByLabelText(/description/i)
    const URLFields = screen.queryAllByRole("link")
    const docURLField = URLFields[0]
    const rpmField = screen.getByTestId("rpm")
    const yumBaseURLField = URLFields[1]
    const commandField = screen.getByTestId("command")
    const contactField = screen.getByTestId("contact")
    const createdField = screen.getByTestId("created")
    const updatedField = screen.getByTestId("last_update")

    expect(nameField.value).toBe("test-probe")
    expect(nameField).toBeDisabled()

    expect(descriptionField.value).toBe("Description of the probe")
    expect(descriptionField).toBeDisabled()

    expect(docURLField.closest("a")).toHaveAttribute("href", "https://github.com/ARGOeu-Metrics/argo-probe-test")

    expect(rpmField.value).toBe("argo-probe-test-0.1.0-1.el7.noarch.rpm")
    expect(rpmField).toBeDisabled()

    expect(yumBaseURLField.closest("a")).toHaveAttribute("href", "http://repo.example.com/devel/centos7/")

    expect(commandField.value).toBe("/usr/libexec/argo/probes/test/test-probe -H <hostname> -t <timeout> --test --flag1 --flag2")
    expect(commandField).toBeDisabled()

    expect(contactField.value).toBe("poem@example.com")
    expect(contactField).toBeDisabled()

    expect(statusField.value).toBe("submitted")
    expect(statusField).toBeEnabled()

    expect(createdField.value).toBe("2023-05-22 09:59:59")
    expect(createdField).toBeDisabled()

    expect(updatedField.value).toBe("")
    expect(updatedField).toBeDisabled()

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  })
})