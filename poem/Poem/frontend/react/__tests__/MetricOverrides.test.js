import React from "react"
import "@testing-library/jest-dom/extend-expect"
import { QueryClient, QueryClientProvider, setLogger } from "react-query"
import { createMemoryHistory } from "history"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { Route, Router } from 'react-router-dom';
import { Backend } from "../DataManager"
import { MetricOverrideChange, MetricOverrideList } from "../MetricOverrides"
import { NotificationManager } from "react-notifications"


jest.mock("../DataManager", () => {
  return {
    Backend: jest.fn()
  }
})

const mockAddObject = jest.fn()
const mockChangeObject = jest.fn()

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
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path="/ui/administration/metricoverrides"
            render={ props => <MetricOverrideList {...props} /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderAddView() {
  const route = "/ui/administration/metricoverrides/add"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path='/ui/administration/metricoverrides/add'
            render={ props => <MetricOverrideChange
              {...props}
              addview={true}
            /> }
          />
        </Router>
      </QueryClientProvider>
    )
  }
}


function renderChangeView() {
  const route = "/ui/administration/metricoverrides/local"
  const history = createMemoryHistory({ initialEntries: [route] })

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <Route
            path="/ui/administration/metricoverrides/:name"
            render={ props => <MetricOverrideChange {...props} /> }
          />
        </Router>
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

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Select metric configuration override to change")
    })

    expect(screen.getAllByRole("columnheader")).toHaveLength(2)
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
    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
    })

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
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  })

  test("Test add global attributes", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
    })

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

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_ACTUAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

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

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.add")))

    fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "some-value" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/cert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/cert.key",
      "globalAttributes.2.attribute": "MOCK_ATTRIBUTE",
      "globalAttributes.2.value": "some-value",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": ""
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.remove")))
    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "MOCK_ATTRIBUTE",
      "globalAttributes.0.value": "some-value",
      "hostAttributes.0.hostname": "",
      "hostAttributes.0.attribute": "",
      "hostAttributes.0.value": "",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.remove")))

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
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
    })

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

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "foo.bar.hr" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
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

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.add")))

    fireEvent.change(screen.getByTestId("hostAttributes.1.hostname"), { target: { value: "host.name.com" } })
    fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("hostAttributes.1.value"), { target: { value: "some-value" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
      "hostAttributes.0.value": "foo-bar",
      "hostAttributes.1.hostname": "host.name.com",
      "hostAttributes.1.attribute": "ATTRIBUTE",
      "hostAttributes.1.value": "some-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "",
      "globalAttributes.0.attribute": "",
      "globalAttributes.0.value": "",
      "hostAttributes.0.hostname": "host.name.com",
      "hostAttributes.0.attribute": "ATTRIBUTE",
      "hostAttributes.0.value": "some-value",
      "metricParameters.0.hostname": "",
      "metricParameters.0.metric": "",
      "metricParameters.0.parameter": "",
      "metricParameters.0.value": "",
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.remove")))

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
  })

  test("Test add metric parameters", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
    })

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

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "8004" } })

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

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "b2share.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "eudat.b2share.invenio.healthcheck" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "https://b2share.eudat.eu" } })

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
      "metricParameters.1.hostname": "b2share.eudat.eu",
      "metricParameters.1.metric": "eudat.b2share.invenio.healthcheck",
      "metricParameters.1.parameter": "--url",
      "metricParameters.1.value": "https://b2share.eudat.eu"
    })

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.remove")))

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
  })

  test("Test save metric override successfully", async () => {
    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
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

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully added", "Added", 2000
    )
  })

  test("Test error saving metric override with message", async () => {
    mockAddObject.mockImplementationOnce( () => { throw Error("There has been an error.") })

    renderAddView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
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
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Add metric configuration override")
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
        changeObject: mockChangeObject
      }
    })
  })

  test("Test that page renders properly", async () => {
    renderChangeView()

    expect(screen.getByText(/loading/i).textContent).toBe("Loading data...")

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
    })

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
  })

  test("Test change global attributes", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
    })

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

    fireEvent.change(screen.getByTestId("globalAttributes.0.attribute"), { target: { value: "NAGIOS_REAL_HOST_CERT" } })
    fireEvent.change(screen.getByTestId("globalAttributes.0.value"), { target: { value: "/etc/nagios/globus/cert.pem" } })

    fireEvent.change(screen.getByTestId("globalAttributes.1.attribute"), { target: { value: "NAGIOS_REAL_HOST_KEY" } })
    fireEvent.change(screen.getByTestId("globalAttributes.1.value"), { target: { value: "/etc/nagios/globus/cert.key" } })

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

    fireEvent.change(screen.getByTestId("globalAttributes.2.attribute"), { target: { value: "MOCK_ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("globalAttributes.2.value"), { target: { value: "some-value" } })

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

    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.1.remove")))
    await waitFor(() => fireEvent.click(screen.getByTestId("globalAttributes.0.remove")))

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
  })

  test("Test change host attributes", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
    })

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

    fireEvent.change(screen.getByTestId("hostAttributes.0.hostname"), { target: { value: "foo.bar.hr" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.attribute"), { target: { value: "FOOBAR" } })
    fireEvent.change(screen.getByTestId("hostAttributes.0.value"), { target: { value: "foo-bar" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
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

    await waitFor(() => fireEvent.click(screen.getByTestId("hostAttributes.0.add")))

    fireEvent.change(screen.getByTestId("hostAttributes.1.hostname"), { target: { value: "host.name.com" } })
    fireEvent.change(screen.getByTestId("hostAttributes.1.attribute"), { target: { value: "ATTRIBUTE" } })
    fireEvent.change(screen.getByTestId("hostAttributes.1.value"), { target: { value: "some-value" } })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
      name: "local",
      "globalAttributes.0.attribute": "NAGIOS_ACTUAL_HOST_CERT",
      "globalAttributes.0.value": "/etc/nagios/globus/hostcert.pem",
      "globalAttributes.1.attribute": "NAGIOS_ACTUAL_HOST_KEY",
      "globalAttributes.1.value": "/etc/nagios/globus/hostkey.pem",
      "hostAttributes.0.hostname": "foo.bar.hr",
      "hostAttributes.0.attribute": "FOOBAR",
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
  })

  test("Test change metric parameters", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
    })

    expect(screen.getByTestId("metric-override-form")).toHaveFormValues({
    })

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

    fireEvent.change(screen.getByTestId("metricParameters.0.hostname"), { target: { value: "epic5.storage.surfsara.nl" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.metric"), { target: { value: "generic.tcp.connect" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.parameter"), { target: { value: "-p" } })
    fireEvent.change(screen.getByTestId("metricParameters.0.value"), { target: { value: "8004" } })

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

    await waitFor(() => fireEvent.click(screen.getByTestId("metricParameters.0.add")))

    fireEvent.change(screen.getByTestId("metricParameters.1.hostname"), { target: { value: "b2share.eudat.eu" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.metric"), { target: { value: "eudat.b2share.invenio.healthcheck" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.parameter"), { target: { value: "--url" } })
    fireEvent.change(screen.getByTestId("metricParameters.1.value"), { target: { value: "https://b2share.eudat.eu" } })

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
      "metricParameters.1.hostname": "b2share.eudat.eu",
      "metricParameters.1.metric": "eudat.b2share.invenio.healthcheck",
      "metricParameters.1.parameter": "--url",
      "metricParameters.1.value": "https://b2share.eudat.eu",
      "metricParameters.2.hostname": "argo.eosc-portal.eu",
      "metricParameters.2.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.2.parameter": "-u",
      "metricParameters.2.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
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
      "metricParameters.0.hostname": "b2share.eudat.eu",
      "metricParameters.0.metric": "eudat.b2share.invenio.healthcheck",
      "metricParameters.0.parameter": "--url",
      "metricParameters.0.value": "https://b2share.eudat.eu",
      "metricParameters.1.hostname": "argo.eosc-portal.eu",
      "metricParameters.1.metric": "org.nagios.ARGOWeb-Status",
      "metricParameters.1.parameter": "-u",
      "metricParameters.1.value": "/eosc/report-status/Default/SERVICEGROUPS?accept=csv"
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
  })

  test("Test save changed metric override successfully", async () => {
    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
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

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith("metricoverride")
    expect(NotificationManager.success).toHaveBeenCalledWith(
      "Metric configuration override successfully changed", "Changed", 2000
    )
  })

  test("Test error saving changed metric override with error message", async () => {
    mockChangeObject.mockImplementationOnce( () => { throw Error("There has been an error.") })

    renderChangeView()

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
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
      expect(screen.getByRole("heading", { name: /override/i }).textContent).toBe("Change metric configuration override")
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
})