import React, { useState, useEffect } from 'react';
import { WebApi } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle } from './UIElements';
import ReactTable from 'react-table';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  FormText,
  Table
} from 'reactstrap';
import { Formik, Form, Field } from 'formik';


export const OperationsProfilesList = (props) => {
  const [loading, setLoading] = useState(false);
  const [listProfiles, setListProfiles] = useState(null);
  const [error, setError] = useState(null);

  const location = props.location;
  const publicView = props.publicView;
  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      try {
          let json = await webapi.fetchOperationsProfiles();
          setListProfiles(json);
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, []);

  const columns = [
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}operationsprofiles/${e.name}`}>
          {e.name}
        </Link>
    }
  ];

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listProfiles)
    return (
      <BaseArgoView
        resourcename='operations profile'
        location={location}
        listview={true}
        addnew={false}
      >
        <ReactTable
          data={listProfiles}
          columns={columns}
          className='-highlight'
          defaultPageSize={12}
          rowsText='profiles'
          getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
        />
      </BaseArgoView>
    )

  else
    return null;
};


export const OperationsProfileDetails = (props) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const name = props.match.params.name;

  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      try {
          let json = await webapi.fetchOperationProfile(name);
          setProfile(json);
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && profile)
    return (
      <BaseArgoView
        resourcename='Operations profile details'
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: profile.name
          }}
          render = {props => (
            <Form>
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        className='form-control form-control-lg'
                        readOnly
                      />
                    </InputGroup>
                    <FormText color='text-muted'>
                      Name of operations profile.
                    </FormText>
                  </Col>
                </Row>
              </FormGroup>
              <ParagraphTitle title='States'/>
              <Row>
                <Col md={4}>
                  <Table bordered size='sm'>
                    <thead>
                      <tr>
                        <th style={{backgroundColor: '#ececec'}}>#</th>
                        <th style={{backgroundColor: '#ececec'}}>Available states</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        profile.available_states.map((state, index) =>
                          <tr key={index}>
                            <th scope='row'>{index + 1}</th>
                            <td>{state}</td>
                          </tr>
                        )
                      }
                    </tbody>
                  </Table>
                </Col>
                <Col md={5}>
                  <Table bordered>
                    <thead>
                      <tr>
                        <th style={{backgroundColor: '#ececec'}}>Default</th>
                        <th style={{backgroundColor: '#ececec'}}>State to be used</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>default_downtime</td>
                        <td>{profile.defaults.down}</td>
                      </tr>
                      <tr>
                        <td>default_missing</td>
                        <td>{profile.defaults.missing}</td>
                      </tr>
                      <tr>
                        <td>default_unknown</td>
                        <td>{profile.defaults.unknown}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
              <ParagraphTitle title='Operations'/>
              <Row>
                {
                  profile.operations.map((operation, oi) =>
                    <Col md={5} key={oi}>
                      <h3 className='text-center'>{operation.name}</h3>
                      <Table bordered size='sm'>
                        <thead>
                          <tr>
                            <th style={{backgroundColor: '#ececec'}}>State A</th>
                            <th style={{backgroundColor: '#ececec'}}>State B</th>
                            <th style={{backgroundColor: '#c1e3ca'}}>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            operation.truth_table.map((row, index) =>
                              <tr key={index}>
                                <td>{row.a}</td>
                                <td>{row.b}</td>
                                <td>{row.x}</td>
                              </tr>
                            )
                          }
                        </tbody>
                      </Table>
                    </Col>
                  )
                }
              </Row>
            </Form>
          )}
        />
      </BaseArgoView>
    );
  else
    return null;
};
