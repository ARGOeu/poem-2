import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { DefaultPortsList } from '../DefaultPorts';
import { Backend } from '../DataManager';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';
import { NotificationManager } from 'react-notifications';


jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

const mockAddobject = jest.fn()

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


function renderView(publicView=false) {
  const route = `/ui/${publicView? "public_" : "administration/"}default_ports`

  if (publicView)
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <DefaultPortsList publicView={ true } />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }

  else 
    return {
      ...render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={ [ route ] }>
            <DefaultPortsList />
          </MemoryRouter>
        </QueryClientProvider>
      )
    }
}


describe("Test default ports list", () => {
  jest.spyOn(NotificationManager, "success")
  jest.spyOn(NotificationManager, "error")
  jest.spyOn(queryClient, "invalidateQueries")

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockDefaultPorts),
        addObject: mockAddobject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    const table = within(screen.getByRole("table"))
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port value" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Action" })).toBeInTheDocument()

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(6)
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

  test("Test that public page renders properly", async () => {
    renderView(true);

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(3)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    const table = within(screen.getByRole("table"))
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port value" })).toBeInTheDocument()

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(6)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort value")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2GRAM_PORT2119")
    expect(rows[4].textContent).toBe("3MYPROXY_PORT7512")
    expect(rows[5].textContent).toBe("4SITE_BDII_PORT2170")

    expect(table.queryAllByTestId(/remove-/i)).toHaveLength(0)
    expect(table.queryAllByTestId(/insert-/i)).toHaveLength(0)
  })

  test("Test filter page by port name", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.change(screen.getAllByPlaceholderText(/search/i)[0], { target: { value: "BDII" } })

    const table = within(screen.getByRole("table"))

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(4)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort valueAction")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2SITE_BDII_PORT2170")

    expect(table.getAllByTestId(/remove-/i)).toHaveLength(2)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(2)
  })

  test("Test filter page by port name if public view", async () => {
    renderView(true);

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(3)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.change(screen.getAllByPlaceholderText(/search/i)[0], { target: { value: "BDII" } })

    const table = within(screen.getByRole("table"))

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(4)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort value")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2SITE_BDII_PORT2170")

    expect(table.queryAllByTestId(/remove-/i)).toHaveLength(0)
    expect(table.queryAllByTestId(/insert-/i)).toHaveLength(0)
  })

  test("Test filter page by port value", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.change(screen.getAllByPlaceholderText(/search/i)[1], { target: { value: "75" } })

    const table = within(screen.getByRole("table"))

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort valueAction")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1MYPROXY_PORT7512")

    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)
  })

  test("Test filter page by port value if public view", async () => {
    renderView(true);

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(3)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.change(screen.getAllByPlaceholderText(/search/i)[1], { target: { value: "75" } })

    const table = within(screen.getByRole("table"))

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort value")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1MYPROXY_PORT7512")

    expect(table.queryAllByTestId(/remove-/i)).toHaveLength(0)
    expect(table.queryAllByTestId(/insert-/i)).toHaveLength(0)
  })

  test("Test adding new port", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.click(screen.getByTestId("insert-1"))

    fireEvent.change(screen.getByTestId("defaultPorts.2.name"), { target: { value: "GRIDFTP_PORT" } });
    fireEvent.change(screen.getByTestId("defaultPorts.2.value"), { target: { value: "2811" } })

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(7)
    const row4 = within(rows[4]).getAllByRole("textbox")
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2GRAM_PORT2119")
    expect(row4[0].value).toBe("GRIDFTP_PORT")
    expect(row4[1].value).toBe("2811")
    expect(rows[5].textContent).toBe("4MYPROXY_PORT7512")
    expect(rows[6].textContent).toBe("5SITE_BDII_PORT2170")

    expect(screen.getAllByTestId(/remove-/i)).toHaveLength(5)
    expect(screen.getAllByTestId(/insert-/i)).toHaveLength(5)
  })

  test("Test removing a port", async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.click(screen.getByTestId("remove-1"))

    const rows = screen.getAllByRole("row")
    expect(rows).toHaveLength(5)
    // row 1 is the one with search fields
    expect(rows[2].textContent).toBe("1BDII_PORT2170")
    expect(rows[3].textContent).toBe("2MYPROXY_PORT7512")
    expect(rows[4].textContent).toBe("3SITE_BDII_PORT2170")

    expect(screen.getAllByTestId(/remove-/i)).toHaveLength(3)
    expect(screen.getAllByTestId(/insert-/i)).toHaveLength(3)
  })

  test("Test change ports and save", async () => {
    mockAddobject.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 200 })
    )
    renderView()

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.click(screen.getByTestId("insert-1"))

    fireEvent.change(screen.getByTestId("defaultPorts.2.name"), { target: { value: "GRIDFTP_PORT" } });
    fireEvent.change(screen.getByTestId("defaultPorts.2.value"), { target: { value: "2811" } })
    fireEvent.click(screen.getByTestId("remove-4"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddobject).toHaveBeenCalledWith(
        "/api/v2/internal/default_ports/",
        {
          ports: [
            { name: "BDII_PORT", value: "2170" },
            { name: "GRAM_PORT", value: "2119" },
            { name: "GRIDFTP_PORT", value: "2811" },
            { name: "MYPROXY_PORT", value: "7512" }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("defaultports")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Default ports successfully changed", "Changed", 2000
    )
  })

  test("Test error changing ports with error message", async () => {
    mockAddobject.mockImplementationOnce(() => {
      throw Error("400 BAD REQUEST: Something went wrong")
    })

    renderView()

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.click(screen.getByTestId("insert-1"))

    fireEvent.change(screen.getByTestId("defaultPorts.2.name"), { target: { value: "GRIDFTP_PORT" } });
    fireEvent.change(screen.getByTestId("defaultPorts.2.value"), { target: { value: "2811" } })
    fireEvent.click(screen.getByTestId("remove-4"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddobject).toHaveBeenCalledWith(
        "/api/v2/internal/default_ports/",
        {
          ports: [
            { name: "BDII_PORT", value: "2170" },
            { name: "GRAM_PORT", value: "2119" },
            { name: "GRIDFTP_PORT", value: "2811" },
            { name: "MYPROXY_PORT", value: "7512" }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test changing ports without error message", async () => {
    mockAddobject.mockImplementationOnce(() => { throw Error() })

    renderView()

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    fireEvent.click(screen.getByTestId("insert-1"))

    fireEvent.change(screen.getByTestId("defaultPorts.2.name"), { target: { value: "GRIDFTP_PORT" } });
    fireEvent.change(screen.getByTestId("defaultPorts.2.value"), { target: { value: "2811" } })
    fireEvent.click(screen.getByTestId("remove-4"))

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /change/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddobject).toHaveBeenCalledWith(
        "/api/v2/internal/default_ports/",
        {
          ports: [
            { name: "BDII_PORT", value: "2170" },
            { name: "GRAM_PORT", value: "2119" },
            { name: "GRIDFTP_PORT", value: "2811" },
            { name: "MYPROXY_PORT", value: "7512" }
          ]
        }
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled()
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing default ports</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test that page renders properly if no data", async () => {
    Backend.mockImplementationOnce(() => {
      return {
        fetchData: () => Promise.resolve([])
      }
    })

    renderView();

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(4)
    })

    expect(screen.getByRole("heading", { name: /port/i }).textContent).toBe("Default ports");

    const table = within(screen.getByRole("table"))
    expect(table.getAllByRole("columnheader")).toHaveLength(4)
    expect(table.getByRole("columnheader", { name: "#" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port name" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Port value" })).toBeInTheDocument()
    expect(table.getByRole("columnheader", { name: "Action" })).toBeInTheDocument()

    const rows = table.getAllByRole("row")
    expect(rows).toHaveLength(3)
    expect(screen.getAllByPlaceholderText(/search/i)).toHaveLength(2)
    expect(rows[0].textContent).toBe("#Port namePort valueAction")
    expect(rows[2].textContent).toBe("1")

    expect(table.getAllByTestId(/remove-/i)).toHaveLength(1)
    expect(table.getAllByTestId(/insert-/i)).toHaveLength(1)
  })
})