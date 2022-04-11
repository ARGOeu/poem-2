import "@testing-library/jest-dom/extend-expect"
import React from "react"
import { createMemoryHistory } from "history"
import { Route, Router } from "react-router-dom"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MetricTagsComponent, MetricTagsList } from "../MetricTags"
import { Backend } from "../DataManager"


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
          }
        }
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i }).textContent).toBe("Change metric tag")
    })

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("internal")
    expect(nameField).toBeEnabled()

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
    const table = within(screen.getByRole("table"))

    expect(table.getAllByRole("columnheader")).toHaveLength(2)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: /metric/i }).textContent).toBe("Metric template")

    expect(table.getAllByRole("row")).toHaveLength(4)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1argo.AMS-Check")
    expect(table.getByRole("row", { name: /2/i }).textContent).toBe("2argo.AMSPublisher-Check")
  })

  test("Test filter metrics", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /metric tag/i })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "publisher" } })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("row")).toHaveLength(3)
    expect(table.getByRole("row", { name: /1/i }).textContent).toBe("1argo.AMSPublisher-Check")
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
  })
})