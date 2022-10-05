import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { createMemoryHistory } from 'history';
import { Route, Router } from 'react-router-dom';
import { DefaultPortsList } from '../DefaultPorts';
import { Backend } from '../DataManager';
import { QueryClient, QueryClientProvider } from 'react-query';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const queryClient = new QueryClient()

beforeEach(() => {
  jest.clearAllMocks()
  queryClient.clear()
})


const mockDefaultPorts = [
  {

    id: "3",
    name: "BDII_PORT",
    value: "2170"
  },
  {
    id: "4",
    name: "GRAM_PORT",
    value: "2119"
  },
  {
    id: "1",
    name: "MYPROXY_PORT",
    value: "7512"
  },
  {
    id: "6",
    name: "SITE_BDII_PORT",
    value: "2170"
  }
]


function renderView() {
  const route = "/ui/administration/default_ports"
  const history = createMemoryHistory({ initialEntries: [route] });

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path="/ui/administration/default_ports"
            component={DefaultPortsList}
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


describe("Test default ports list", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockDefaultPorts)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderView();

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");
    })

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(4)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port value" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Action" })).toBeInTheDocument()

    const rows = table.getAllByRole("row")
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort valueAction")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2GRAM_PORT2119")
    expect(rows[4].textContent).toBe("3MYPROXY_PORT7512")
    expect(rows[5].textContent).toBe("4SITE_BDII_PORT2170")

    expect(table.getAllByTestId(/remove-/i)).toHaveLength(4)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(4)
  })
})