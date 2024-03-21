import '@testing-library/jest-dom/extend-expect';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from "react";
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { APIKeyChange, APIKeyList } from '../APIKey';
import { Backend } from '../DataManager';
import { NotificationManager } from 'react-notifications';
import { QueryClient, QueryClientProvider, setLogger } from 'react-query';


const queryClient = new QueryClient();

setLogger({
  log: () => {},
  warn: () => {},
  error: () => {}
})

function renderListView() {
  const route = "/ui/administration/apikey"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <APIKeyList />
        </MemoryRouter>
      </QueryClientProvider>
    )
  };
}


function renderChangeView(isTenant=false, webapi=false) {
  const route = `/ui/administration/apikey/${webapi ? "WEB-API-TENANT" : "FIRST_TOKEN"}`

  return {
    ...render(
      <QueryClientProvider client={ queryClient }>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route 
              path="/ui/administration/apikey/:name"
              element={
                <APIKeyChange isTenantSchema={ isTenant } />
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderAddview(isTenant=false) {
  const route = "/ui/administration/apikey/add"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <APIKeyChange 
            addview={ true }
            isTenantSchema={ isTenant } 
          />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


const mockAPIKeys = [
  {
    id: 1,
    name: 'FIRST_TOKEN',
    created: '2020-11-09 13:00:00',
    revoked: false,
    used_by: "poem"
  },
  {
    id: 2,
    name: 'SECOND_TOKEN',
    created: '2020-11-09 13:10:01',
    revoked: false,
    used_by: "poem"
  },
  {
    id: 1,
    name: 'WEB-API-TENANT1',
    created: '2023-03-08 08:56:34',
    revoked: false,
    used_by: "webapi"
  },
  {
    id: 3,
    name: 'WEB-API-TENANT1-RO',
    created: '2023-03-08 09:00:00',
    revoked: false,
    used_by: "webapi"
  },
  {
    id: 2,
    name: 'WEB-API-TENANT2',
    created: '2023-03-08 08:58:28',
    revoked: false,
    used_by: "webapi"
  },
  {
    id: 4,
    name: 'WEB-API-TENANT2-RO',
    created: '2023-03-08 09:01:20',
    revoked: false,
    used_by: "webapi"
  }
]


const mockChangeObject = jest.fn();
const mockAddObject = jest.fn();
const mockDeleteObject = jest.fn();

jest.mock('../DataManager', () => {
  return {
    Backend: jest.fn()
  }
})

Object.assign(navigator, {
  clipboard: {
    writeText: () => {},
  },
});

afterEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
})


describe("Tests for API keys listview", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockAPIKeys)
      }
    })
  })

  it('Render properly', async () => {
    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getByRole("columnheader", { name: /used by/i }).textContent).toBe("Used by")
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(4)
    expect(screen.getByRole('row', {name: /first_token/i}).textContent).toBe('1FIRST_TOKEN2020-11-09 13:00:00poem')
    expect(screen.getByRole('row', {name: /second_token/i}).textContent).toBe('2SECOND_TOKEN2020-11-09 13:10:01poem')
    expect(screen.getAllByRole("row", { name: /web-api-tenant1/i })[0].textContent).toBe("3WEB-API-TENANT12023-03-08 08:56:34webapi")
    expect(screen.getByRole("row", { name: /web-api-tenant1-ro/i }).textContent).toBe("4WEB-API-TENANT1-RO2023-03-08 09:00:00webapi")
    expect(screen.getAllByRole("row", { name: /web-api-tenant2/i })[0].textContent).toBe("5WEB-API-TENANT22023-03-08 08:58:28webapi")
    expect(screen.getByRole("row", { name: /web-api-tenant2-ro/i }).textContent).toBe("6WEB-API-TENANT2-RO2023-03-08 09:01:20webapi")
    expect(screen.getByRole("link", { name: /first/i })).toHaveProperty("href", "http://localhost/ui/administration/apikey/FIRST_TOKEN")
    expect(screen.getByRole('link', {name: /second/i})).toHaveProperty('href', 'http://localhost/ui/administration/apikey/SECOND_TOKEN')
    expect(screen.getByRole("link", { name: "WEB-API-TENANT1" })).toHaveProperty("href", "http://localhost/ui/administration/apikey/WEB-API-TENANT1")
    expect(screen.getByRole("link", { name: "WEB-API-TENANT1-RO" })).toHaveProperty("href", "http://localhost/ui/administration/apikey/WEB-API-TENANT1-RO")
    expect(screen.getByRole("link", { name: "WEB-API-TENANT2" })).toHaveProperty("href", "http://localhost/ui/administration/apikey/WEB-API-TENANT2")
    expect(screen.getByRole("link", { name: "WEB-API-TENANT2-RO" })).toHaveProperty("href", "http://localhost/ui/administration/apikey/WEB-API-TENANT2-RO")
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })

  it('Render empty table properly', async () => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve([])
      }
    })

    renderListView()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Select API key to change')
    })
    expect(screen.getAllByRole('columnheader')).toHaveLength(5)
    expect(screen.getByRole('columnheader', {name: /name/i}).textContent).toBe('Name')
    expect(screen.getByRole('columnheader', {name: /#/i}).textContent).toBe('#')
    expect(screen.getByRole('columnheader', {name: /created/i}).textContent).toBe('Created')
    expect(screen.getByRole('columnheader', {name: /revoked/i}).textContent).toBe('Revoked')
    expect(screen.getByRole("columnheader", { name: /used by/i }).textContent).toBe("Used by")
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getAllByRole('row', {name: ''})).toHaveLength(9)
    expect(screen.getByRole('row', {name: /no/i}).textContent).toBe('No API keys')
    expect(screen.getByRole('button', {name: 'Add'})).toBeTruthy()
  })
})


describe('Tests for tenant API key change', () => {
  jest.spyOn(navigator.clipboard, "writeText");
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    const mockAPIKey = {
      id: 1,
      name: 'FIRST_TOKEN',
      token: '123456',
      created: '2020-11-09 13:00:00',
      revoked: false,
      used_by: "poem"
    }

    const mockWebAPIKey = {
      id: 1,
      name: 'WEB-API-TENANT',
      token: '78910',
      created: '2023-03-09 10:27:13',
      revoked: false,
      used_by: "webapi"
    }

    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/apikeys/FIRST_TOKEN":
              return Promise.resolve(mockAPIKey)

            case "/api/v2/internal/apikeys/WEB-API-TENANT":
              return Promise.resolve(mockWebAPIKey)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  it('Test that page renders properly', async () => {
    renderChangeView(true)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Change API key')
    });

    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')

    const nameField = screen.getByTestId("name")
    expect(nameField.value).toBe('FIRST_TOKEN')
    expect(nameField).toBeDisabled()
    expect(screen.getByTestId("revoked").checked).toBeFalsy()
    expect(screen.getByDisplayValue(/123/i).value).toBe('123456');
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
  })

  it('Test that page renders properly if webapi key', async () => {
    renderChangeView(true, true)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Change API key')
    });

    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')

    const nameField = screen.getByTestId("name")
    const checkboxField = screen.getByTestId("revoked")
    expect(nameField.value).toBe('WEB-API-TENANT')
    expect(nameField).toBeDisabled()
    expect(checkboxField.checked).toBeFalsy()
    expect(checkboxField).toBeDisabled()
    expect(screen.getByDisplayValue(/789/i).value).toBe('78910');
    expect(screen.getByDisplayValue(/789/i)).toBeDisabled();
    expect(screen.queryByRole('button', {name: /save/i})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /delete/i})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: ''})).toBeInTheDocument();
  })

  test("Test that page renders properly if the key is revoked", async () => {
    let mockRevokedKey = {
      id: 2,
      name: 'SECOND_TOKEN',
      token: '123456789',
      created: '2020-11-09 13:00:00',
      revoked: true,
      used_by: "poem"
    }
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockRevokedKey)
      }
    })

    renderChangeView(true)

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", {name: /api/i}).textContent).toBe("Change API key")
    });

    expect(screen.getByRole("heading", {name: /credent/i}).textContent).toBe("Credentials")

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("SECOND_TOKEN")
    expect(nameField).toBeDisabled()
    expect(screen.getByTestId("revoked").checked).toBeTruthy()
    expect(screen.getByDisplayValue(/123/i).value).toBe("123456789")
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled()

    expect(screen.getByRole("button", {name: /save/i})).toBeInTheDocument()
    expect(screen.getByRole("button", {name: /delete/i})).toBeInTheDocument()
    expect(screen.getByRole("button", {name: ''})).toBeInTheDocument()
  })

  test("Test that page renders properly if the webapi key is revoked", async () => {
    let mockRevokedKey = {
      id: 2,
      name: 'WEB-API-TENANT2',
      token: '123456789',
      created: '2023-03-09 10:32:48',
      revoked: true,
      used_by: "webapi"
    }

    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockRevokedKey)
      }
    })

    renderChangeView(true)

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", {name: /api/i}).textContent).toBe("Change API key")
    });

    expect(screen.getByRole("heading", {name: /credent/i}).textContent).toBe("Credentials")

    const nameField = screen.getByTestId("name")
    const checkboxField = screen.getByTestId("revoked")

    expect(nameField.value).toBe("WEB-API-TENANT2")
    expect(nameField).toBeDisabled()
    expect(checkboxField.checked).toBeTruthy()
    expect(checkboxField).toBeDisabled()
    expect(screen.getByDisplayValue(/123/i).value).toBe("123456789")
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled()

    expect(screen.queryByRole("button", {name: /save/i})).not.toBeInTheDocument()
    expect(screen.queryByRole("button", {name: /delete/i})).not.toBeInTheDocument()
    expect(screen.getByRole("button", {name: ''})).toBeInTheDocument()
  })

  it('Test copy to clipbord button', async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', {name: ''}))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456')
  })

  it('Test revoke API key and save', async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully changed', 'Changed', 2000)
  })

  it('Test revoke API key with backend error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: Something went wrong')
    } );

    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test change API key with backend error without message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test API key deletion', async () => {
    renderChangeView(true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', {name: /delete/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /delete/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/poem_FIRST_TOKEN'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully deleted', 'Deleted', 2000)
  })
})


describe('Tests for super POEM API key change', () => {
  jest.spyOn(navigator.clipboard, "writeText");
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeEach(() => {
    const mockAPIKey = {
      id: 1,
      name: 'FIRST_TOKEN',
      token: '123456',
      created: '2020-11-09 13:00:00',
      revoked: false,
      used_by: "poem"
    }

    const mockWebAPIKey = {
      id: 1,
      name: 'WEB-API-TENANT',
      token: '78910',
      created: '2023-03-09 10:27:13',
      revoked: false,
      used_by: "webapi"
    }

    Backend.mockImplementation(() => {
      return {
        fetchData: (path) => {
          switch (path) {
            case "/api/v2/internal/apikeys/FIRST_TOKEN":
              return Promise.resolve(mockAPIKey)

            case "/api/v2/internal/apikeys/WEB-API-TENANT":
              return Promise.resolve(mockWebAPIKey)
          }
        },
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  it('Test that page renders properly', async () => {
    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Change API key')
    });

    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')

    const nameField = screen.getByTestId("name")
    expect(nameField.value).toBe('FIRST_TOKEN')
    expect(nameField).toBeDisabled()
    expect(screen.getByTestId('revoked').checked).toBeFalsy()
    expect(screen.getByDisplayValue(/123/i).value).toBe('123456');
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
  })

  it('Test that page renders properly if webapi key', async () => {
    renderChangeView(false, true)

    expect(screen.getByText(/loading/i).textContent).toBe('Loading data...');

    await waitFor(() => {
      expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Change API key')
    });

    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')

    const nameField = screen.getByTestId("name")
    const checkboxField = screen.getByTestId("revoked")
    expect(nameField.value).toBe('WEB-API-TENANT')
    expect(nameField).toBeDisabled()
    expect(checkboxField.checked).toBeFalsy()
    expect(checkboxField).toBeEnabled()
    expect(screen.getByDisplayValue(/789/i).value).toBe('78910');
    expect(screen.getByDisplayValue(/789/i)).toBeDisabled();
    expect(screen.queryByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /delete/i})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: ''})).toBeInTheDocument();
  })

  test("Test that page renders properly if the key is revoked", async () => {
    let mockRevokedKey = {
      id: 2,
      name: 'SECOND_TOKEN',
      token: '123456789',
      created: '2020-11-09 13:00:00',
      revoked: true,
      used_by: "poem"
    }
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockRevokedKey)
      }
    })

    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", {name: /api/i}).textContent).toBe("Change API key")
    });

    expect(screen.getByRole("heading", {name: /credent/i}).textContent).toBe("Credentials")

    const nameField = screen.getByTestId("name")

    expect(nameField.value).toBe("SECOND_TOKEN")
    expect(nameField).toBeDisabled()
    expect(screen.getByTestId("revoked").checked).toBeTruthy()
    expect(screen.getByDisplayValue(/123/i).value).toBe("123456789")
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled()

    expect(screen.getByRole("button", {name: /save/i})).toBeInTheDocument()
    expect(screen.getByRole("button", {name: /delete/i})).toBeInTheDocument()
    expect(screen.getByRole("button", {name: ''})).toBeInTheDocument()
  })

  test("Test that page renders properly if the webapi key is revoked", async () => {
    let mockRevokedKey = {
      id: 2,
      name: 'WEB-API-TENANT2',
      token: '123456789',
      created: '2023-03-09 10:32:48',
      revoked: true,
      used_by: "webapi"
    }

    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockRevokedKey)
      }
    })

    renderChangeView(false, true)

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", {name: /api/i}).textContent).toBe("Change API key")
    });

    expect(screen.getByRole("heading", {name: /credent/i}).textContent).toBe("Credentials")

    const nameField = screen.getByTestId("name")
    const checkboxField = screen.getByTestId("revoked")

    expect(nameField.value).toBe("WEB-API-TENANT2")
    expect(nameField).toBeDisabled()
    expect(checkboxField.checked).toBeTruthy()
    expect(checkboxField).toBeEnabled()
    expect(screen.getByDisplayValue(/123/i).value).toBe("123456789")
    expect(screen.getByDisplayValue(/123/i)).toBeDisabled()

    expect(screen.queryByRole("button", {name: /save/i})).toBeInTheDocument()
    expect(screen.queryByRole("button", {name: /delete/i})).toBeInTheDocument()
    expect(screen.getByRole("button", {name: ''})).toBeInTheDocument()
  })

  it('Test copy to clipbord button', async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', {name: ''})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', {name: ''}))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('123456')
  })

  it('Test revoke API key and save', async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully changed', 'Changed', 2000)
  })

  it('Test revoke web API key and save', async () => {
    renderChangeView(false, true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'WEB-API-TENANT', used_by: "webapi"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully changed', 'Changed', 2000)
  })

  it('Test revoke API key with backend error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: Something went wrong')
    } );

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test revoke web API key with backend error message', async () => {
    mockChangeObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: Something went wrong')
    } );

    renderChangeView(false, true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'WEB-API-TENANT', used_by: "webapi"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: Something went wrong</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test change API key with backend error without message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'FIRST_TOKEN', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test change web API key with backend error without message', async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() } );

    renderChangeView(false, true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    })
    fireEvent.click(screen.getByTestId("revoked"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /change/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {id: 1, revoked: true, name: 'WEB-API-TENANT', used_by: "webapi"}
      )
    })
    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  test('Test API key deletion', async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', {name: /delete/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /delete/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/poem_FIRST_TOKEN'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully deleted', 'Deleted', 2000)
  })

  test('Test web API key deletion', async () => {
    renderChangeView(false, true)

    await waitFor(() => {
      expect(screen.getByRole('button', {name: /delete/i})).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', {name: /delete/i}))
    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /delete/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/webapi_WEB-API-TENANT'
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully deleted', 'Deleted', 2000)
  })
})


describe('Tests for tenant API key addview', () => {
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })
  })

  it ('Test that addview renders properly', () => {
    renderAddview(true)

    expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Add API key')
    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')
    expect(screen.getByTestId('name').value).toBe('');
    expect(screen.getByTestId("revoked").checked).toBeFalsy()
    expect(screen.getByRole('alert').textContent).toBe('If token field is left empty, value will be automatically generated on save.')
    expect(screen.getByTestId('token').value).toBe('');
    expect(screen.getByTestId('token')).toBeEnabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })

  it ('Test adding new API key', async () => {
    renderAddview(true)

    fireEvent.change(screen.getByTestId('name'), { target: { value: "WEB-API-TEST" } });

    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', {title: /add/i})).not.toBeInTheDocument()
    })
    expect(screen.getByText("Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId("name"), { target: { value: "APIKEY" } })

    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: '', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it ('Test adding new API key with predefined token', async () => {
    renderAddview(true)

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it('Test add API key with backend error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: API key with this name already exists')
    } );

    renderAddview(true)

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: API key with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test add API key with backend error without message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddview(true)

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})


describe('Tests for super POEM API key addview', () => {
  jest.spyOn(NotificationManager, "success");
  jest.spyOn(NotificationManager, "error");
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        addObject: mockAddObject
      }
    })
  })

  it ('Test that addview renders properly', () => {
    renderAddview()

    expect(screen.getByRole('heading', {name: /api/i}).textContent).toBe('Add API key')
    expect(screen.getByRole('heading', {name: /credent/i}).textContent).toBe('Credentials')
    expect(screen.getByTestId('name').value).toBe('');
    expect(screen.getByTestId("revoked").checked).toBeFalsy()
    expect(screen.getByTestId("used_by").checked).toBeFalsy()
    expect(screen.getByRole('alert').textContent).toBe('If token field is left empty, value will be automatically generated on save.')
    expect(screen.getByTestId('token').value).toBe('');
    expect(screen.getByTestId('token')).toBeEnabled();
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument();
    expect(screen.queryByText(/delete/i)).not.toBeInTheDocument();
  })

  it ('Test adding new web API key', async () => {
    renderAddview()

    fireEvent.change(screen.getByTestId('name'), { target: { value: "WEB-API-TEST" } });
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', {title: /add/i})).not.toBeInTheDocument()
    })
    expect(screen.getByText("Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-")).toBeInTheDocument()

    fireEvent.click(screen.getByTestId("used_by"))

    await waitFor(() => {
      expect(screen.queryByText("Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'WEB-API-TEST', token: '', used_by: "webapi"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it ('Test adding new web API key with predefined token', async () => {
    renderAddview()

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    expect(screen.queryByText("Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-")).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId("used_by"))
    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', {title: /add/i})).not.toBeInTheDocument()
    })
    expect(screen.queryByText("Name must have form WEB-API-<tenant_name> or WEB-API-<tenant_name>-RO")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'WEB-API-TEST'}});
    await waitFor(() => {
      expect(screen.queryByText("Name must have form WEB-API-<tenant_name> or WEB-API-<tenant_name>-RO")).not.toBeInTheDocument()
    })
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'WEB-API-TEST', token: 'token123', used_by: "webapi"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it ('Test adding new API key', async () => {
    renderAddview()

    fireEvent.change(screen.getByTestId('name'), { target: { value: "WEB-API-TEST" } });

    fireEvent.click(screen.getByRole('button', {name: /save/i}))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', {title: /add/i})).not.toBeInTheDocument()
    })
    expect(screen.getByText("Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-")).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('name'), { target: { value: "APIKEY" } });

    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: '', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })

  it ('Test adding new API key with predefined token', async () => {
    renderAddview()

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith('apikey');
    expect(NotificationManager.success).toHaveBeenCalledWith('API key successfully added', 'Added', 2000)
  })
  it('Test add API key with backend error message', async () => {
    mockAddObject.mockImplementationOnce( () => {
      throw Error('400 BAD REQUEST: API key with this name already exists')
    } );

    renderAddview()

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>400 BAD REQUEST: API key with this name already exists</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })

  it('Test add API key with backend error without message', async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() } );

    renderAddview()

    fireEvent.change(screen.getByTestId('name'), {target: {value: 'APIKEY'}});
    fireEvent.change(screen.getByTestId('token'), {target: {value: 'token123'}})
    fireEvent.click(screen.getByRole('button', {name: /save/i}))

    await waitFor(() => {
      expect(screen.getByRole('dialog', {title: /add/i})).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', {name: /yes/i}))
    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        '/api/v2/internal/apikeys/',
        {name: 'APIKEY', token: 'token123', used_by: "poem"}
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith('apikey');
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding API key</p>
        <p>Click to dismiss.</p>
      </div>,
      'Error',
      0,
      expect.any(Function)
    )
  })
})