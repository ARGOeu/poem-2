import React, { useMemo } from "react";
import { useQuery, useQueryClient } from "react-query";
import { fetchUserDetails } from "./QueryFunctions";
import { Backend } from "./DataManager";
import { 
  BaseArgoTable, 
  BaseArgoView, 
  ErrorComponent, 
  LoadingAnim, 
  ParagraphTitle 
} from "./UIElements";
import { 
  Badge, 
  Button, 
  Col, 
  Form, 
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


const fetchCandidates = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/probecandidates")
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

  const columns = useMemo(() => [
    {
      Header: "#",
      accessor: null,
      column_width: "5%"
    },
    {
      Header: "Name",
      id: "name",
      column_width: "20%",
      accessor: e => 
        <Link to={`/ui/administration/probecandidates/${e.id}`}>
          { e.name }
        </Link>
    },
    {
      Header: "Description",
      accessor: "description",
      column_width: "58%"
    },
    {
      Header: "Created",
      accessor: "created",
      column_width: "12%"
    },
    {
      Header: "Status",
      accessor: "status",
      column_width: "5%",
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
                  <Badge color="secondary" className="fw-normal">{ row.value }</Badge>
          }
        </div>
    }
  ])

  if (loadingUserDetails || loadingProbeCandidates)
    return (<LoadingAnim />)

  else if (errorUserDetails)
    return (<ErrorComponent error={ errorUserDetails } />)
  
  else if (errorProbeCandidates)
    return (<ErrorComponent error={ errorProbeCandidates } />)

  else if (probeCandidates && userDetails?.is_superuser)
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
        />
      </BaseArgoView>
    )

  else
    return null
}


const ProbeCandidateForm = ({ data, ...props }) => {
  const location = props.location

  const { control } = useForm({
    defaultValues: data
  })

  return (
    <BaseArgoView
      resourcename="probe candidate"
      location={ location }
      history={ false }
      submitperm={ true }
      addview={ false }
      publicview={ false }
    >
      <Form>
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
                      disabled={ true }
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
                    <Input
                      { ...field }
                      data-testid="status"
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
                    disabled={ true }
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
                    <div className='form-control' style={{backgroundColor: '#e9ecef', overflow: 'hidden', textOverflow: 'ellipsis'}}>
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
                      disabled={ true }
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
                    <div className='form-control' style={{backgroundColor: '#e9ecef', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      <a href={ field.value } style={{'whiteSpace': 'nowrap'}}>{ field.value }</a>
                    </div>
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
                    disabled={ true }
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
          <Button color="success">
            Save
          </Button>
        </div>
      </Form>
    </BaseArgoView>
  )
}


export const ProbeCandidateChange = (props) => {
  const pcid = props.match.params.id

  const backend = new Backend()
  const queryClient = useQueryClient()

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

  if (userDetailsLoading || candidateLoading)
    return (<LoadingAnim />)

  else if (userDetailsError)
    return (<ErrorComponent error={ userDetailsError } />)
  
  else if (candidateError)
    return (<ErrorComponent error={ candidateError } />)

  else if (userDetails && candidate)
    return (
      <ProbeCandidateForm data={ candidate } { ...props }/>
    )

  else 
    return null
}