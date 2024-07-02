import React from "react"
import "@testing-library/jest-dom"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Backend } from "../DataManager"
import { MetricOverrideChange, MetricOverrideList } from "../MetricOverrides"
import { NotificationManager } from "react-notifications"
import useEvent from '@testing-library/user-event';


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn()
  }
})

const mockAddObject = jest.fn()
const mockChangeObject = jest.fn()
const mockDeleteObject = jest.fn()

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


const mockConfigurations = [
  {
    id: "2",
    name: "consumer",
    global_attributes: [],
    host_attributes: [],
    metric_parameters: [
      {
        hostname: "eosccore.mon.devel.argo.grnet.gr",
        metric: "argo.AMSPublisher-Check",
        parameter: "-q",
        value: "w:metrics+g:published180"
      }
    ]
  },
  {
    id: "1",
    name: "local",
    global_attributes: [
      {
        attribute: "NAGIOS_ACTUAL_HOST_CERT",
        value: "/etc/nagios/globus/hostcert.pem"
      },
      {
        attribute: "NAGIOS_ACTUAL_HOST_KEY",
        value: "/etc/nagios/globus/hostkey.pem"
      }
    ],
    host_attributes: [
      {
        hostname: "mock.host.name",
        attribute: "attr1",
        value: "some-new-value"
      }
    ],
    metric_parameters: [
      {
        hostname: "eosccore.ui.argo.grnet.gr",
        metric: "org.nagios.ARGOWeb-AR",
        parameter: "-r",
        value: "EOSC_Monitoring"
      },
      {
        hostname: "argo.eosc-portal.eu",
        metric: "org.nagios.ARGOWeb-Status",
        parameter: "-u",
        value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
      }
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
    id: '1',
    groups: {
      aggregations: ['ARGO', 'EGI'],
      metricprofiles: ['ARGO', 'TEST'],
      metrics: ['TEST3', 'TEST4'],
      thresholdsprofiles: ['TEST', 'TESTa']
    }
  }
}


function renderListView() {
  const route = "/ui/administration/metricoverrides"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <MetricOverrideList />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderAddView() {
  const route = "/ui/administration/metricoverrides/add"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <MetricOverrideChange addview={ true } />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


function renderChangeView() {
  const route = "/ui/administration/metricoverrides/local"

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={ [ route ] }>
          <Routes>
            <Route
              path="/ui/administration/metricoverrides/:name"
              element={ <MetricOverrideChange /> }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}


describe("Tests for metric overrides listview", () => {
  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockConfigurations),
        isActiveSession: () => Promise.resolve(mockActiveSession)
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderListView()

    await waitFor(() => {
      expect(screen.getAllByRole("columnheader")).toHaveLength(2)
    })

    expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Select metric configuration override to change")

    expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()

    expect(screen.getAllByRole("row")).toHaveLength(11)
    expect(screen.getAllByRole("row", { name: "" })).toHaveLength(8)
    expect(screen.getByRole("row", { name: /consumer/i }).textContent).toBe("1consumer")
    expect(screen.getByRole("link", { name: /consumer/i }).closest("a")).toHaveAttribute("href", "/ui/administration/metricoverrides/consumer")
    expect(screen.getByRole("row", { name: /local/i }).textContent).toBe("2local")
    expect(screen.getByRole("link", { name: /local/i }).closest("a")).toHaveAttribute("href", "/ui/administration/metricoverrides/local")

    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i }).closest('a')).toHaveAttribute('href', '/ui/administration/metricoverrides/add')
  })
})


describe("Tests for metric configuration overrides addview", () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        isActiveSession: () => Promise.resolve(mockActiveSession),
        addObject: mockAddObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")

    const nameField = screen.getByTestId("name")

    const globalAttribute = screen.getByTestId("globalAttributes.0.attribute")
    const globalValue = screen.getByTestId("globalAttributes.0.value")

    const hostAttributeHostname = screen.getByTestId("hostAttributes.0.hostname")
    const hostAttribute = screen.getByTestId("hostAttributes.0.attribute")
    const hostAttributeValue = screen.getByTestId("hostAttributes.0.value")

    const parameterHostname = screen.getByTestId("metricParameters.0.hostname")
    const parameterMetric = screen.getByTestId("metricParameters.0.metric")
    const parameterKey = screen.getByTestId("metricParameters.0.parameter")
    const parameterValue = screen.getByTestId("metricParameters.0.value")

    expect(nameField.value).toBe("")
    expect(nameField).toBeEnabled()

    expect(globalAttribute.value).toBe("")
    expect(globalAttribute).toBeEnabled()
    expect(globalValue.value).toBe("")
    expect(globalValue).toBeEnabled()
    expect(screen.getByTestId("globalAttributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("globalAttributes.0.add")).toBeInTheDocument()

    expect(hostAttributeHostname.value).toBe("")
    expect(hostAttributeHostname).toBeEnabled()
    expect(hostAttribute.value).toBe("")
    expect(hostAttribute).toBeEnabled()
    expect(hostAttributeValue.value).toBe("")
    expect(hostAttributeValue).toBeEnabled()
    expect(screen.getByTestId("hostAttributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("hostAttributes.0.add")).toBeInTheDocument()

    expect(parameterHostname.value).toBe("")
    expect(parameterHostname).toBeEnabled()
    expect(parameterMetric.value).toBe("")
    expect(parameterMetric).toBeEnabled()
    expect(parameterKey.value).toBe("")
    expect(parameterKey).toBeEnabled()
    expect(parameterValue.value).toBe("")
    expect(parameterValue).toBeEnabled()
    expect(screen.getByTestId("metricParameters.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("metricParameters.0.add")).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /json/i })).toBeInTheDocument()
  })

  test("Test add name", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const nameField = screen.getByTestId("name")
    const requiredMsg = "Name field is required"
    const alphanumericMsg = "Name can contain alphanumeric characters, dash and underscore, but must always begin with a letter"

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "consumer" } })
    })

    expect(screen.queryByText(requiredMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(alphanumericMsg)).not.toBeInTheDocument()

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "" } })
    })

    await waitFor(() => {
      expect(screen.queryByText(requiredMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(alphanumericMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "1consumer" } })
    })

    await waitFor(() => {
      expect(screen.queryByText(requiredMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(alphanumericMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(nameField, { target: { value: "ItSR3tard3d" } })
    })

    await waitFor(() => {
      expect(screen.queryByText(requiredMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(alphanumericMsg)).not.toBeInTheDocument()
    })
  })

  test("Test add global attributes", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const attrMsg = "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const attrValMsg = "Attribute value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_CERT" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "",
      "globalAttributes.1.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_KEY" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "" } } ))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.remove")))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.remove")))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
    })
  })

  test("Test add host attributes", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const hostnameMsg = "Invalid hostname"
    const attrMsg = "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const attrValMsg = "Attribute value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } }))

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "foo.bar.hr" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "hostAttributes.1.hostname": "",
      "hostAttributes.1.attribute": "",
      "hostAttributes.1.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "ATTRIBUTE" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.hostname"), { target: { value: "-hostnamecom" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.value"), { target: { value: "some-value" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.hostname"), { target: { value: "host.name.com" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "mock.ATTRIBUTE" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "hostAttributes.1.hostname": "host.name.com",
      "hostAttributes.1.attribute": "mock.ATTRIBUTE",
      "hostAttributes.1.value": "some-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "host.name.com",
      "hostAttributes.0.attribute": "mock.ATTRIBUTE",
      "hostAttributes.0.value": "some-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })
  })

  test("Test add metric parameters", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const hostnameMsg = "Invalid hostname"
    const metricMsg = "Metric name can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const paramMsg = "Parameter cannot contain white space"
    const paramValMsg = "Parameter value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "epic5.storage.surfsara.nl" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic.tcp.connect" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-p" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() =>{ 
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "8004" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004"
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "",
      "metricParameters.1.metric": "",
      "metricParameters.1.parameter": "",
      "metricParameters.1.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "eudat.b2share.invenio.healthcheck" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "",
      "metricParameters.1.metric": "eudat.b2share.invenio.healthcheck",
      "metricParameters.1.parameter": "",
      "metricParameters.1.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "--url" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "",
      "metricParameters.1.metric": "",
      "metricParameters.1.parameter": "--url",
      "metricParameters.1.value": ""
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "https://b2share.eudat.eu" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "",
      "metricParameters.1.metric": "",
      "metricParameters.1.parameter": "",
      "metricParameters.1.value": "https://b2share.eudat.eu"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("metricParameters.1.remove"))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "-b2shareeudat" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic@tcp.connect" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "b2share.eudat.eu" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "eudat.b2share.invenio.healthcheck" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "https://b2share.eudat.eu" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "b2share.eudat.eu",
      "metricParameters.0.metric": "eudat.b2share.invenio.healthcheck",
      "metricParameters.0.parameter": "--url",
      "metricParameters.0.value": "https://b2share.eudat.eu"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
     
    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })
  })

  test("Test import json successfully", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /json/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /import/i }))

    const content = new Blob([JSON.stringify({
      global_attributes: [
        {
          attribute: "ROBOT_CERT",
          value: "/etc/sensu/certs/robotcert.pem"
        },
        {
          attribute: "ROBOT_KEY",
          value: "/etc/sensu/certs/robotkey.pem"
        }
      ],
      host_attributes: [
        {
          hostname: "poem.devel.argo.grnet.gr",
          attribute: "ARGO_TENANTS_TOKEN",
          value: "$DEVEL_ARGO_TENANTS_TOKEN"
        }
      ],
      metric_parameters: [
        {
          hostname: "",
          metric: "",
          parameter: "",
          value: ""
        }
      ]
    })])

    const file = new File([content], "test.json", { type: "application/json" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => {
      useEvent.upload(input, file)
    })

    await waitFor(() => {
      expect(input.files[0]).toBe(file)
    })

    expect(input.files.item(0)).toBe(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "ROBOT_CERT",
      "globalAttributes.0.value": "/etc/sensu/certs/robotcert.pem",
      "globalAttributes.1.attribute": "ROBOT_KEY",
      "globalAttributes.1.value": "/etc/sensu/certs/robotkey.pem",
      "hostAttributes.0.hostname": "poem.devel.argo.grnet.gr",
      "hostAttributes.0.attribute": "ARGO_TENANTS_TOKEN",
      "hostAttributes.0.value": "$DEVEL_ARGO_TENANTS_TOKEN",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })
  })

  test("Test save metric override with just name", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          name: "local",
          global_attributes: [
            {
              attribute: "",
              value: ""
            }
          ],
          host_attributes: [
            {
              hostname: "",
              attribute: "",
              value: ""
            }
          ],
          metric_parameters: [
            {
              hostname: "",
              metric: "",
              parameter: "",
              value: ""
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully added", "Added", 2000
    )
  })

  test("Test save metric override successfully", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "sensu.cro-ngi" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "argo.AMSPublisher-Check" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-q" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "w:metrics+g:published180 -c 10" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          name: "local",
          global_attributes: [
            {
              attribute: "NAGIOS_ACTUAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "NAGIOS_ACTUAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "sensu.cro-ngi",
              metric: "argo.AMSPublisher-Check",
              parameter: "-q",
              value: "w:metrics+g:published180 -c 10"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully added", "Added", 2000
    )
  })

  test("Test error saving metric override with message", async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error("There has been an error.") })

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "b2access.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "eudat.b2access.unity-cert" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "https://b2access.mock.url" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          name: "local",
          global_attributes: [
            {
              attribute: "NAGIOS_ACTUAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "NAGIOS_ACTUAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "b2access.eudat.eu",
              metric: "eudat.b2access.unity-cert",
              parameter: "--url",
              value: "https://b2access.mock.url"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error saving metric override without message", async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error() })

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "b2access.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "eudat.b2access.unity-cert" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "https://b2access.mock.url" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockAddObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          name: "local",
          global_attributes: [
            {
              attribute: "NAGIOS_ACTUAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "NAGIOS_ACTUAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "b2access.eudat.eu",
              metric: "eudat.b2access.unity-cert",
              parameter: "--url",
              value: "https://b2access.mock.url"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error adding metric configuration override</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })
})


describe("Tests for metric configuration overrides changeview", () => {
  jest.spyOn(NotificationManager, 'success');
  jest.spyOn(NotificationManager, 'error');
  jest.spyOn(queryClient, 'invalidateQueries');

  beforeAll(() => {
    Backend.mockImplementation(() => {
      return {
        fetchData: () => Promise.resolve(mockConfigurations[1]),
        isActiveSession: () => Promise.resolve(mockActiveSession),
        changeObject: mockChangeObject,
        deleteObject: mockDeleteObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")

    const nameField = screen.getByTestId("name")

    const globalAttribute1 = screen.getByTestId("globalAttributes.0.attribute")
    const globalValue1 = screen.getByTestId("globalAttributes.0.value")

    const globalAttribute2 = screen.getByTestId("globalAttributes.1.attribute")
    const globalValue2 = screen.getByTestId("globalAttributes.1.value")

    const hostAttributeHostname = screen.getByTestId("hostAttributes.0.hostname")
    const hostAttribute = screen.getByTestId("hostAttributes.0.attribute")
    const hostAttributeValue = screen.getByTestId("hostAttributes.0.value")

    const parameterHostname1 = screen.getByTestId("metricParameters.0.hostname")
    const parameterMetric1 = screen.getByTestId("metricParameters.0.metric")
    const parameterKey1 = screen.getByTestId("metricParameters.0.parameter")
    const parameterValue1 = screen.getByTestId("metricParameters.0.value")

    const parameterHostname2 = screen.getByTestId("metricParameters.1.hostname")
    const parameterMetric2 = screen.getByTestId("metricParameters.1.metric")
    const parameterKey2 = screen.getByTestId("metricParameters.1.parameter")
    const parameterValue2 = screen.getByTestId("metricParameters.1.value")

    expect(nameField.value).toBe("local")
    expect(nameField).toBeEnabled()

    expect(globalAttribute1.value).toBe("NAGIOS_ACTUAL_HOST_CERT")
    expect(globalAttribute1).toBeEnabled()
    expect(globalValue1.value).toBe("/etc/nagios/globus/hostcert.pem")
    expect(globalValue1).toBeEnabled()

    expect(globalAttribute2.value).toBe("NAGIOS_ACTUAL_HOST_KEY")
    expect(globalAttribute2).toBeEnabled()
    expect(globalValue2.value).toBe("/etc/nagios/globus/hostkey.pem")
    expect(globalValue2).toBeEnabled()

    expect(screen.getByTestId("globalAttributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("globalAttributes.0.add")).toBeInTheDocument()
    expect(screen.getByTestId("globalAttributes.1.remove")).toBeInTheDocument()
    expect(screen.getByTestId("globalAttributes.1.add")).toBeInTheDocument()

    expect(hostAttributeHostname.value).toBe("mock.host.name")
    expect(hostAttributeHostname).toBeEnabled()
    expect(hostAttribute.value).toBe("attr1")
    expect(hostAttribute).toBeEnabled()
    expect(hostAttributeValue.value).toBe("some-new-value")
    expect(hostAttributeValue).toBeEnabled()
    expect(screen.getByTestId("hostAttributes.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("hostAttributes.0.add")).toBeInTheDocument()

    expect(parameterHostname1.value).toBe("eosccore.ui.argo.grnet.gr")
    expect(parameterHostname1).toBeEnabled()
    expect(parameterMetric1.value).toBe("org.nagios.ARGOWeb-AR")
    expect(parameterMetric1).toBeEnabled()
    expect(parameterKey1.value).toBe("-r")
    expect(parameterKey1).toBeEnabled()
    expect(parameterValue1.value).toBe("EOSC_Monitoring")
    expect(parameterValue1).toBeEnabled()

    expect(parameterHostname2.value).toBe("argo.eosc-portal.eu")
    expect(parameterHostname2).toBeEnabled()
    expect(parameterMetric2.value).toBe("org.nagios.ARGOWeb-Status")
    expect(parameterMetric2).toBeEnabled()
    expect(parameterKey2.value).toBe("-u")
    expect(parameterKey2).toBeEnabled()
    expect(parameterValue2.value).toBe("/eosc/report-status/Default/SERVICEGROUPS?accept=csv")
    expect(parameterValue2).toBeEnabled()

    expect(screen.getByTestId("metricParameters.0.remove")).toBeInTheDocument()
    expect(screen.getByTestId("metricParameters.0.add")).toBeInTheDocument()
    expect(screen.getByTestId("metricParameters.1.remove")).toBeInTheDocument()
    expect(screen.getByTestId("metricParameters.1.add")).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clone/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
  })

  test("Test change global attributes", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const attrMsg = "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const attrValMsg = "Attribute value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "1NAGIOS_REAL_HOST_KEY" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "1NAGIOS_REAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_REAL_HOST_KEY",
      "globalAttributes.1.value": "",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_REAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_REAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "globalAttributes.2.attribute": "",
      "globalAttributes.2.value": "",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "MOCK_ATTRIBUTE" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "some-value" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_REAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_REAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "globalAttributes.2.attribute": "MOCK_ATTRIBUTE",
      "globalAttributes.2.value": "some-value",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => { 
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.remove")))
    fireEvent.click(screen.getByTestId("globalAttributes.0.remove"))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "MOCK_ATTRIBUTE",
      "globalAttributes.0.value": "some-value",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.remove")))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    }) 

    await waitFor(() => fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "test_value" } }))

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })
  })

  test("Test change host attributes", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const hostnameMsg = "Invalid hostname"
    const attrMsg = "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const attrValMsg = "Attribute value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "-foo" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "-foo",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "@test" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "-foo",
      "hostAttributes.0.attribute": "@test",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "-foo",
      "hostAttributes.0.attribute": "@test",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "foo.bar.hr" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "baz.FOOBAR" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "baz.FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "baz.FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "hostAttributes.1.hostname": "",
      "hostAttributes.1.attribute": "",
      "hostAttributes.1.value": "",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.hostname"), { target: { value: "host.name.com" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "ATTRIBUTE" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.value"), { target: { value: "some-value" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "baz.FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "hostAttributes.1.hostname": "host.name.com",
      "hostAttributes.1.attribute": "ATTRIBUTE",
      "hostAttributes.1.value": "some-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "host.name.com",
      "hostAttributes.0.attribute": "ATTRIBUTE",
      "hostAttributes.0.value": "some-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "SOME_ATTRIBUTE" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "SOME_ATTRIBUTE",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "some_value" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "SOME_ATTRIBUTE",
      "hostAttributes.0.value": "some_value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.name.net" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "host.name.net",
      "hostAttributes.0.attribute": "SOME_ATTRIBUTE",
      "hostAttributes.0.value": "some_value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId("hostAttributes.0.add"))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "host.name.net",
      "hostAttributes.0.attribute": "SOME_ATTRIBUTE",
      "hostAttributes.0.value": "some_value",
      "hostAttributes.1.hostname": "",
      "hostAttributes.1.attribute": "",
      "hostAttributes.1.value": "",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("hostAttributes.1.value"), { target: { value: "another_value" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "host.name.net",
      "hostAttributes.0.attribute": "SOME_ATTRIBUTE",
      "hostAttributes.0.value": "some_value",
      "hostAttributes.1.hostname": "",
      "hostAttributes.1.attribute": "",
      "hostAttributes.1.value": "another_value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(attrValMsg)).not.toBeInTheDocument()
    })
  })

  test("Test change metric parameters", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    const hostnameMsg = "Invalid hostname"
    const metricMsg = "Metric name can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const paramMsg = "Parameter cannot contain white space"
    const paramValMsg = "Parameter value is required"

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "eosccore.ui.argo.grnet.gr",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "-storagenl" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "-storagenl",
      "metricParameters.0.metric": "org.nagios.ARGOWeb-AR",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic.tcp@connect" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "-storagenl",
      "metricParameters.0.metric": "generic.tcp@connect",
      "metricParameters.0.parameter": "-r",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: " p" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "-storagenl",
      "metricParameters.0.metric": "generic.tcp@connect",
      "metricParameters.0.parameter": " p",
      "metricParameters.0.value": "EOSC_Monitoring",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "-storagenl",
      "metricParameters.0.metric": "generic.tcp@connect",
      "metricParameters.0.parameter": " p",
      "metricParameters.0.value": "",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "epic5.storage.surfsara.nl" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic.tcp.connect" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-p" } }))
    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "8004" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "",
      "metricParameters.1.metric": "",
      "metricParameters.1.parameter": "",
      "metricParameters.1.value": "",
      "metricParameters.2.hostname": "argo.eosc-portal.eu",
      "metricParameters.2.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.2.parameter": "-u",
      "metricParameters.2.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "sensu.cro-ngi" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "argo.AMSPublisher-Check" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-q" } }))

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "w:metrics+g:published180 -c 10" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "epic5.storage.surfsara.nl",
      "metricParameters.0.metric": "generic.tcp.connect",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": "8004",
      "metricParameters.1.hostname": "sensu.cro-ngi",
      "metricParameters.1.metric": "argo.AMSPublisher-Check",
      "metricParameters.1.parameter": "-q",
      "metricParameters.1.value": "w:metrics+g:published180 -c 10",
      "metricParameters.2.hostname": "argo.eosc-portal.eu",
      "metricParameters.2.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.2.parameter": "-u",
      "metricParameters.2.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => { 
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "sensu.cro-ngi",
      "metricParameters.0.metric": "argo.AMSPublisher-Check",
      "metricParameters.0.parameter": "-q",
      "metricParameters.0.value": "w:metrics+g:published180 -c 10",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.remove")))
    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-p" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "-p",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "some-value" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "some-value"
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "argo.ams-check" } }))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "mock.host.name",
      "hostAttributes.0.attribute": "attr1",
      "hostAttributes.0.value": "some-new-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "argo.ams-check",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => {
      expect(screen.queryByText(hostnameMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramMsg)).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.queryByText(paramValMsg)).toBeInTheDocument()
    })
  })

  test("Test import json successfully", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /json/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /import/i }))

    const content = new Blob([JSON.stringify({
      global_attributes: [
        {
          attribute: "ROBOT_CERT",
          value: "/etc/sensu/certs/robotcert.pem"
        },
        {
          attribute: "ROBOT_KEY",
          value: "/etc/sensu/certs/robotkey.pem"
        }
      ],
      host_attributes: [
        {
          hostname: "poem.devel.argo.grnet.gr",
          attribute: "ARGO_TENANTS_TOKEN",
          value: "$DEVEL_ARGO_TENANTS_TOKEN"
        }
      ],
      metric_parameters: [
        {
          hostname: "",
          metric: "",
          parameter: "",
          value: ""
        }
      ]
    })])

    const file = new File([content], "test.json", { type: "application/json" })
    const input = screen.getByTestId("file_input")

    await waitFor(() => {
      useEvent.upload(input, file)
    })

    await waitFor(() => {
      expect(input.files[0]).toBe(file)
    })

    expect(input.files.item(0)).toBe(file)
    expect(input.files).toHaveLength(1)

    await waitFor(() => {
      fireEvent.load(screen.getByTestId("file_input"))
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "ROBOT_CERT",
      "globalAttributes.0.value": "/etc/sensu/certs/robotcert.pem",
      "globalAttributes.1.attribute": "ROBOT_KEY",
      "globalAttributes.1.value": "/etc/sensu/certs/robotkey.pem",
      "hostAttributes.0.hostname": "poem.devel.argo.grnet.gr",
      "hostAttributes.0.attribute": "ARGO_TENANTS_TOKEN",
      "hostAttributes.0.value": "$DEVEL_ARGO_TENANTS_TOKEN",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          id: "1",
          name: "local",
          global_attributes: [
            {
              attribute: "ROBOT_CERT",
              value: "/etc/sensu/certs/robotcert.pem"
            },
            {
              attribute: "ROBOT_KEY",
              value: "/etc/sensu/certs/robotkey.pem"
            }
          ],
          host_attributes: [
            {
              hostname: "poem.devel.argo.grnet.gr",
              attribute: "ARGO_TENANTS_TOKEN",
              value: "$DEVEL_ARGO_TENANTS_TOKEN"
            }
          ],
          metric_parameters: [
            {
              hostname: "",
              metric: "",
              parameter: "",
              value: ""
            }
          ]
        }
      )
    })
  })

  test("Test export json successfully", async () => {
    const helpers = require("../FileDownload")
    jest.spyOn(helpers, "downloadJSON").mockReturnValueOnce(null)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /json/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }))

    const content = {
      global_attributes: [
        {
          attribute: "NAGIOS_ACTUAL_HOST_CERT",
          value: "/etc/nagios/globus/hostcert.pem"
        },
        {
          attribute: "NAGIOS_ACTUAL_HOST_KEY",
          value: "/etc/nagios/globus/hostkey.pem"
        }
      ],
      host_attributes: [
        {
          hostname: "mock.host.name",
          attribute: "attr1",
          value: "some-new-value"
        }
      ],
      metric_parameters: [
        {
          hostname: "eosccore.ui.argo.grnet.gr",
          metric: "org.nagios.ARGOWeb-AR",
          parameter: "-r",
          value: "EOSC_Monitoring"
        },
        {
          hostname: "argo.eosc-portal.eu",
          metric: "org.nagios.ARGOWeb-Status",
          parameter: "-u",
          value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
        }
      ]
    }

    expect(helpers.downloadJSON).toHaveBeenCalledTimes(1)
    expect(helpers.downloadJSON).toHaveBeenCalledWith(content, "local.json")
  })

  test("Test export json when form has been changed", async () => {
    const helpers = require("../FileDownload")
    jest.spyOn(helpers, "downloadJSON").mockReturnValueOnce(null)

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("name"), { target: { value: "local_new" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "mock-attribute-value" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "/etc/nagios/globus/cert.key" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "sensu.cro-ngi" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "argo.AMSPublisher-Check" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-q" } })
    })
    
    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "w:metrics+g:published180 -c 10" } })
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    })

    await waitFor(() => {
      fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })
    })

    fireEvent.click(screen.getByRole("button", { name: /json/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /export/i }))

    const content = {
      global_attributes: [
        {
          attribute: "NAGIOS_REAL_HOST_CERT",
          value: "/etc/nagios/globus/cert.pem"
        },
        {
          attribute: "MOCK_ATTRIBUTE",
          value: "mock-attribute-value"
        },
        {
          attribute: "NAGIOS_REAL_HOST_KEY",
          value: "/etc/nagios/globus/cert.key"
        }
      ],
      host_attributes: [
        {
          hostname: "host.foo.bar",
          attribute: "FOOBAR",
          value: "foo-bar"
        }
      ],
      metric_parameters: [
        {
          hostname: "sensu.cro-ngi",
          metric: "argo.AMSPublisher-Check",
          parameter: "-q",
          value: "w:metrics+g:published180 -c 10"
        },
        {
          hostname: "epic5.storage.surfsara.nl",
          metric: "generic.tcp.connect",
          parameter: "-p",
          value: "8004"
        },
        {
          hostname: "argo.eosc-portal.eu",
          metric: "org.nagios.ARGOWeb-Status",
          parameter: "-u",
          value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
        }
      ]
    }

    expect(helpers.downloadJSON).toHaveBeenCalledTimes(1)
    expect(helpers.downloadJSON).toHaveBeenCalledWith(content, "local.json")
  })

  test("Test save metric override with only name", async () => {
    renderChangeView()

    const hostnameMsg = "Invalid hostname"
    const metricMsg = "Metric name can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
    const paramMsg = "Parameter cannot contain white space"
    const paramValMsg = "Parameter value is required"

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local_new" } })

    fireEvent.click(screen.getByTestId("globalAttributes.1.remove"))
    fireEvent.click(screen.getByTestId("globalAttributes.0.remove"))
    fireEvent.click(screen.getByTestId("hostAttributes.0.remove"))
    fireEvent.click(screen.getByTestId("metricParameters.1.remove"))
    fireEvent.click(screen.getByTestId("metricParameters.0.remove"))

    expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    expect(screen.queryByText(hostnameMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(metricMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(paramMsg)).not.toBeInTheDocument()
    expect(screen.queryByText(paramValMsg)).not.toBeInTheDocument()

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          id: "1",
          name: "local_new",
          global_attributes: [
            {
              attribute: "",
              value: ""
            }
          ],
          host_attributes: [
            {
              hostname: "",
              attribute: "",
              value: ""
            }
          ],
          metric_parameters: [
            {
              hostname: "",
              metric: "",
              parameter: "",
              value: ""
            }
          ]
        }
      )
    })
  })

  test("Test save changed metric override successfully", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local_new" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "mock-attribute-value" } })

    fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "sensu.cro-ngi" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "argo.AMSPublisher-Check" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-q" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "w:metrics+g:published180 -c 10" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          id: "1",
          name: "local_new",
          global_attributes: [
            {
              attribute: "NAGIOS_REAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "MOCK_ATTRIBUTE",
              value: "mock-attribute-value"
            },
            {
              attribute: "NAGIOS_REAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "sensu.cro-ngi",
              metric: "argo.AMSPublisher-Check",
              parameter: "-q",
              value: "w:metrics+g:published180 -c 10"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            },
            {
              hostname: "argo.eosc-portal.eu",
              metric: "org.nagios.ARGOWeb-Status",
              parameter: "-u",
              value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully changed", "Changed", 2000
    )
  })

  test("Test error saving changed metric override with error message", async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error("There has been an error.") })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local_new" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "mock-attribute-value" } })

    fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "b2access.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "eudat.b2access.unity-cert" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "https://b2access.mock.url" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          id: "1",
          name: "local_new",
          global_attributes: [
            {
              attribute: "NAGIOS_REAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "MOCK_ATTRIBUTE",
              value: "mock-attribute-value"
            },
            {
              attribute: "NAGIOS_REAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "b2access.eudat.eu",
              metric: "eudat.b2access.unity-cert",
              parameter: "--url",
              value: "https://b2access.mock.url"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            },
            {
              hostname: "argo.eosc-portal.eu",
              metric: "org.nagios.ARGOWeb-Status",
              parameter: "-u",
              value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error saving changed metric override without error message", async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error() })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "local_new" } })

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "mock-attribute-value" } })

    fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "host.foo.bar" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "b2access.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "eudat.b2access.unity-cert" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "https://b2access.mock.url" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "8004" } })

    fireEvent.click(screen.getByRole("button", { name: /save/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /add/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockChangeObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/",
        {
          id: "1",
          name: "local_new",
          global_attributes: [
            {
              attribute: "NAGIOS_REAL_HOST_CERT",
              value: "/etc/nagios/globus/cert.pem"
            },
            {
              attribute: "MOCK_ATTRIBUTE",
              value: "mock-attribute-value"
            },
            {
              attribute: "NAGIOS_REAL_HOST_KEY",
              value: "/etc/nagios/globus/cert.key"
            }
          ],
          host_attributes: [
            {
              hostname: "host.foo.bar",
              attribute: "FOOBAR",
              value: "foo-bar"
            }
          ],
          metric_parameters: [
            {
              hostname: "b2access.eudat.eu",
              metric: "eudat.b2access.unity-cert",
              parameter: "--url",
              value: "https://b2access.mock.url"
            },
            {
              hostname: "epic5.storage.surfsara.nl",
              metric: "generic.tcp.connect",
              parameter: "-p",
              value: "8004"
            },
            {
              hostname: "argo.eosc-portal.eu",
              metric: "org.nagios.ARGOWeb-Status",
              parameter: "-u",
              value: "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
            }
          ]
        }
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error changing metric configuration override</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test delete metric configuration override successfully", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.change(screen.getByTestId("name"), { target: { value: "new_name" } })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/local"
      )
    })

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully deleted", "Deleted", 2000
    )
  })

  test("Test error delete metric configuration override with message", async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error("There has been an error.") })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/local"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>There has been an error.</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })

  test("Test error delete metric configuration override without message", async () => {
    mockDeleteObject.mockImplementationOnce( () => { throw Error() })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    })

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { title: /delete/i })).toBeInTheDocument();
    })
    fireEvent.click(screen.getByRole('button', { name: /yes/i }));

    await waitFor(() => {
      expect(mockDeleteObject).toHaveBeenCalledWith(
        "/api/v2/internal/metricconfiguration/local"
      )
    })

    expect(queryClient.invalidateQueries).not.toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.error).toHaveBeenCalledWith(
      <div>
        <p>Error deleting metric configuration override</p>
        <p>Click to dismiss.</p>
      </div>,
      "Error",
      0,
      expect.any(Function)
    )
  })
})