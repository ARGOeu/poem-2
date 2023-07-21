import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { fetchUserDetails } from "./QueryFunctions";
import { Backend, WebApi } from "./DataManager";
import { 
  BaseArgoTable, 
  BaseArgoView, 
  CustomError, 
  DefaultColumnFilter, 
  DropdownWithFormText, 
  ErrorComponent, 
  LoadingAnim, 
  NotifyError, 
  NotifyOk, 
  ParagraphTitle,
  SelectColumnFilter
} from "./UIElements";
import { 
  Badge, 
  Button, 
  Col, 
  Form, 
  FormFeedback, 
  FormGroup, 
  FormText, 
  Input, 
  InputGroup, 
  InputGroupText, 
  Label, 
  Row 
} from "reactstrap";
import { Link } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from "@hookform/error-message";


const validationSchema = yup.object().shape({
  status: yup.string(),
  service_type: yup.string().when("status", {
    is: (val) => val !== "submitted",
    then: yup.string().required("Service type is required")
  }),
  devel_url: yup.string().url("Invalid URL").when("status", {
    is: (val) => val === "testing",
    then: yup.string().required("Devel UI URL is required")
  })
})


const fetchCandidates = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/probecandidates")
}


const fetchStatuses = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/probecandidatestatuses")
}


export const ProbeCandidateList = (props) => {
  const location = props.location

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    "userDetails", () => fetchUserDetails(true)
  )

  const { data: probeCandidates, error: errorProbeCandidates, isLoading: loadingProbeCandidates } = useQuery(
    "probecandidate", () => fetchCandidates(),
    { enabled: !!userDetails }
  )

  const { data: statuses, error: errorStatuses, isLoading: loadingStatuses } = useQuery(
    "probecandidatestatus", () => fetchStatuses(),
    { enabled: !!userDetails }
  )

  const columns = useMemo(() => [
    {
      Header: "#",
      accessor: null,
      column_width: "5%"
    },
    {
      Header: "Name",
      id: "name",
      column_width: "25%",
      accessor: "name",
      Cell: e => 
        <Link to={`/ui/administration/probecandidates/${e.row.original.id}`}>
          { e.value }
        </Link>,
      Filter: DefaultColumnFilter
    },
    {
      Header: "Description",
      accessor: "description",
      column_width: "50%",
      Filter: DefaultColumnFilter
    },
    {
      Header: "Created",
      accessor: "created",
      column_width: "12%",
      Filter: DefaultColumnFilter
    },
    {
      Header: "Status",
      accessor: "status",
      column_width: "8%",
      Cell: row =>
        <div style={{ textAlign: "center" }}>
          {
            row.value === "submitted" ?
              <Badge color="info" className="fw-normal">{ row.value }</Badge>
            :
              row.value === "testing" ?
                <Badge color="warning" className="fw-normal">{ row.value }</Badge>
              :
                row.value === "deployed" ?
                  <Badge color="success" className="fw-normal">{ row.value }</Badge>
                :
                  row.value === "rejected" ?
                    <Badge color="danger" className="fw-normal">{ row.value }</Badge>
                  :
                    <Badge color="secondary" className="fw-normal">{ row.value }</Badge>
          }
        </div>,
      filterList: statuses,
      Filter: SelectColumnFilter
    }
  ])

  if (loadingUserDetails || loadingProbeCandidates || loadingStatuses )
    return (<LoadingAnim />)

  else if (errorUserDetails)
    return (<ErrorComponent error={ errorUserDetails } />)
  
  else if (errorProbeCandidates)
    return (<ErrorComponent error={ errorProbeCandidates } />)
  
  else if (errorStatuses)
    return (<ErrorComponent error={ errorStatuses } />)

  else if (probeCandidates && statuses && userDetails?.is_superuser)
    return (
      <BaseArgoView
        resourcename="Select probe candidate to change"
        location={ location }
        infoview={ true }
      >
        <BaseArgoTable
          data={ probeCandidates }
          columns={ columns }
          page_size={ 10 }
          resourcename="probe candidates"
          filter={ true }
        />
      </BaseArgoView>
    )

  else
    return null
}


const ProbeCandidateForm = ({ 
  data, 
  statuses, 
  serviceTypes,
  doChange,
  ...props 
}) => {
  const location = props.location

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [onYes, setOnYes] = useState("")

  const { control, setValue, handleSubmit, getValues, trigger, formState: { errors } } = useForm({
    defaultValues: data,
    mode: "all",
    resolver: yupResolver(validationSchema)
  })

  const onSubmitHandle = () => {
    setAreYouSureModal(!areYouSureModal)
    setModalMsg("Are you sure you want to change probe candidate?")
    setModalTitle("Change probe candidate")
    setOnYes("change")
  }

  const onYesCallback = () => {
    if (onYes === "change")
      doChange(getValues())
  }

  return (
    <BaseArgoView
      resourcename="probe candidate"
      location={ location }
      history={ false }
      submitperm={ true }
      addview={ false }
      publicview={ false }
      modal={ true }
      state={{
        areYouSureModal, 
        "modalFunc": onYesCallback, 
        modalTitle, 
        modalMsg
      }}
      toggle={ () => setAreYouSureModal(!areYouSureModal) }
    >
      <Form onSubmit={ handleSubmit(onSubmitHandle) }>
        <FormGroup>
          <Row className="mb-2">
            <Col md={ 6 }>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="name"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Probe name
              </FormText>
            </Col>
            <Col md={ 2 } className="mt-1">
              <InputGroup>
                <InputGroupText>Status</InputGroupText>
                <Controller
                  name="status"
                  control={ control }
                  render={ ({ field }) =>
                    <DropdownWithFormText
                      forwardedRef={ field.ref }
                      onChange={ e => {
                        setValue("status", e.value) 
                        trigger("service_type")
                      }}
                      options={ statuses }
                      value={ field.value }
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row className="mb-2">
            <Col md={ 6 }>
              <InputGroup>
                <InputGroupText>Service type</InputGroupText>
                <Controller
                  name="service_type"
                  control={ control }
                  render={ ({ field }) =>
                    <DropdownWithFormText
                      forwardedRef={ field.ref }
                      onChange={ e => {
                        setValue("service_type", e ? e.value : "") 
                        trigger("service_type")
                      }}
                      options={ serviceTypes }
                      value={ field.value }
                      isClearable={ true }
                      error={ errors.service_type }
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Suggested service type for testing
              </FormText>
              {
                errors?.service_type &&
                  <CustomError error={ errors?.service_type.message } />
              }
            </Col>
          </Row>
          <Row className="mb-2">
            <Col md={ 6 }>
              <InputGroup>
                <InputGroupText>Devel UI URL</InputGroupText>
                <Controller
                  name="devel_url"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="devel_url"
                      className={ `form-control ${errors?.devel_url && "is-invalid"}` }
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="devel_url"
                  render={ ({ message }) => 
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
              <FormText color="muted">
                URL showing the results of probe testing
              </FormText>
            </Col>
          </Row>
          <Row>
            <Col md={ 6 }>
              <InputGroup>
                <InputGroupText>Production UI URL</InputGroupText>
                <Controller
                  name="production_url"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="production_url"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={ 8 }>
              <Label for="description">Description</Label>
              <Controller
                name="description"
                control={ control }
                render={ ({ field }) =>
                  <textarea
                    { ...field }
                    id="description"
                    rows="10"
                    className="form-control"
                  />
                }
              />
            </Col>
            <FormText color="muted">
              Free text description outlining the purpose of this probe.
            </FormText>
          </Row>
        </FormGroup>
        <ParagraphTitle title="Creation info"/>
        <FormGroup>
          <Row className="pb-2">
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>Created</InputGroupText>
                <Controller
                  name="created"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      className="form-control"
                      data-testid="created"
                      disabled={ true }
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Date and time of creation
              </FormText>
            </Col>
          </Row>
          <Row>
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>Last update</InputGroupText>
                <Controller
                  name="last_update"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      className="form-control"
                      data-testid="last_update"
                      disabled={ true }
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Date and time of last update
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        <ParagraphTitle title="Probe metadata" />
        <FormGroup>
          <Row className="pb-2">
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>Documentation</InputGroupText>
                <Controller
                  name="docurl"
                  control={ control }
                  render={ ({ field }) =>
                    <div className='form-control' style={{backgroundColor: '#f8f9fa', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      <a href={ field.value } style={{'whiteSpace': 'nowrap'}}>{ field.value }</a>
                    </div>
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Probe documentation URL
              </FormText>
            </Col>
          </Row>
          <Row className="pb-2">
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>RPM</InputGroupText>
                <Controller
                  name="rpm"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="rpm"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Name of RPM containing the probe
              </FormText>
            </Col>
          </Row>
          <Row>
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>YUM base URL</InputGroupText>
                <Controller
                  name="yum_baseurl"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="yum_baseurl"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Base URL of YUM repo containing the probe RPM
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        <ParagraphTitle title="Metric info"/>
        <FormGroup>
          <Row>
            <Col md={ 8 }>
              <Label for="command">Command</Label>
              <Controller
                name="command"
                control={ control }
                render={ ({ field }) =>
                  <textarea
                    { ...field }
                    rows="5"
                    id="command"
                    data-testid="command"
                    className="form-control"
                  />
                }
              />
              <FormText color="muted">
                Command to execute
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        <ParagraphTitle title="Contact info"/>
        <FormGroup>
          <Row>
            <Col md={ 8 }>
              <InputGroup>
                <InputGroupText>Email</InputGroupText>
                <Controller
                  name="contact"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      className="form-control"
                      data-testid="contact"
                      disabled={ true }
                    />
                  }
                />
              </InputGroup>
              <FormText color="muted">
                Contact email
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
          <Button
            color="danger"
          >
            Delete
          </Button>
          <Button 
            color="success"
            id="submit-button"
            type="submit"
          >
            Save
          </Button>
        </div>
      </Form>
    </BaseArgoView>
  )
}


export const ProbeCandidateChange = (props) => {
  const pcid = props.match.params.id
  const history = props.history
  const showtitles = props.showtitles

  const backend = new Backend()

  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const queryClient = useQueryClient()

  const mutation = useMutation(async (values) => await backend.changeObject("/api/v2/internal/probecandidates/", values))

  const { data: userDetails, error: userDetailsError, isLoading: userDetailsLoading } = useQuery(
    "userdetails", () => fetchUserDetails(true)
  )

  const { data: candidate, error: candidateError, isLoading: candidateLoading } = useQuery(
    ["probecandidate", pcid], async () => await backend.fetchData(`/api/v2/internal/probecandidates/${pcid}`),
    { 
      enabled: !!userDetails,
      initialData: () => {
        let candidates = queryClient.getQueryData("probecandidate")
        if (candidates)
          return candidates.find(cand => cand.id == pcid)
      }
    }
  )

  const { data: statuses, error: statusesError, isLoading: statusesLoading } = useQuery(
    "probecandidatestatus", () => fetchStatuses(),
    { enabled: !!userDetails }
  )

  const { data: serviceTypes, error: serviceTypesError, isLoading: serviceTypesLoading } = useQuery(
    ["servicetypes", "webapi"], async () => {
      return await webapi.fetchServiceTypes()
    },
    { enabled: !!userDetails }
  )

  const doChange = ( values ) => {
    mutation.mutate({
      id: values.id,
      name: values.name,
      description: values.description,
      docurl: values.docurl,
      rpm: values.rpm,
      yum_baseurl: values.yum_baseurl,
      command: values.command,
      contact: values.contact,
      status: values.status,
      service_type: values.service_type,
      devel_url: values.devel_url
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries("probecandidate")
        NotifyOk({
          msg: "Probe candidate successfully changed",
          title: "Changed",
          callback: () => history.push("/ui/administration/probecandidates")
        })
      },
      onError: (error) => {
        NotifyError({
          title: "Error",
          msg: error.message ? error.message : "Error changing probe candidate"
        })
      }
    })
  }

  if (userDetailsLoading || candidateLoading || statusesLoading || serviceTypesLoading)
    return (<LoadingAnim />)

  else if (userDetailsError)
    return (<ErrorComponent error={ userDetailsError } />)
  
  else if (candidateError)
    return (<ErrorComponent error={ candidateError } />)

  else if (statusesError)
    return (<ErrorComponent error={ statusesError } />)

  else if (serviceTypesError)
    return (<ErrorComponent error={ serviceTypesError } />)

  else if (userDetails && candidate && statuses && serviceTypes)
    return (
      <ProbeCandidateForm 
        data={ candidate } 
        statuses={ statuses }
        serviceTypes={ showtitles ? serviceTypes.map(type => type.title) : serviceTypes.map(type => type.name) }
        doChange={ doChange }
        { ...props }
      />
    )

  else 
    return null
}