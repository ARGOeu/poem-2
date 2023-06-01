import React from "react";
import '@testing-library/jest-dom/extend-expect';
import { QueryClient, QueryClientProvider, setLogger } from "react-query";
import { createMemoryHistory } from 'history';
import { render, screen, waitFor } from "@testing-library/react";
import { Route, Router } from "react-router";
import { ProbeCandidateList } from "../ProbeCandidates";
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