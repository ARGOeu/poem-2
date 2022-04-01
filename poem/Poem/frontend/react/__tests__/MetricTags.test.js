import "@testing-library/jest-dom/extend-expect"
import React from "react"
import { createMemoryHistory } from "history"
import { Route, Router } from "react-router-dom"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { MetricsTagsList } from "../MetricTags"
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


function renderListView() {
  const route = "/ui/metrictags"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            render={ props => <MetricsTagsList {...props} /> }
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
  })
})
