import React from 'react';
import { WebApi } from './DataManager';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  ErrorComponent,
  BaseArgoView,
  ParagraphTitle,
  ProfilesListTable
} from './UIElements';
import {
  Form,
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupText,
  FormText,
  Table,
  Input
} from 'reactstrap';
import { useQuery, useQueryClient } from 'react-query';
import { fetchOperationsProfiles } from './QueryFunctions';
import { 
  ListViewPlaceholder,
  ChangeViewPlaceholder,
  InputPlaceholder
} from './Placeholders';

export const OperationsProfilesList = (props) => {
  const location = useLocation();
  const publicView = props.publicView;
  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  const { data: profiles, error, status } = useQuery(
    `${publicView ? 'public_' : ''}operationsprofile`, () => fetchOperationsProfiles(webapi)
  );

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}operationsprofiles/${e.name}`}>
          {e.name}
        </Link>,
      column_width: '20%'
    },
    {
      Header: 'Description',
      accessor: 'description',
      column_width: '78%'
    }
  ], [publicView]);

  if (status === 'loading')
    return (
      <ListViewPlaceholder 
        resourcename='operations profile'
        infoview={ true }
      />
    )

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (profiles)
    return (
      <BaseArgoView
        resourcename='operations profile'
        location={location}
        listview={true}
        addnew={false}
      >
        <ProfilesListTable
          data={profiles}
          columns={columns}
          type='operations'
        />
      </BaseArgoView>
    );

  else
    return null;
};


export const OperationsProfileDetails = (props) => {
  const { name } = useParams();
  const token = props.webapitoken;
  const webapioperations = props.webapioperations;
  const publicView = props.publicView;

  const webapi = new WebApi({
    token: token,
    operationsProfiles: webapioperations
  });

  const queryClient = useQueryClient();

  const { data: profile, error, status } = useQuery(
    [`${publicView ? 'public_' : ''}operationsprofile`, name], async () => {
      return await webapi.fetchOperationProfile(name);
    },
    {
      initialData: () => {
        return queryClient.getQueryData('operationsprofile')?.find(profile => profile.name === name)
      }
    }
  )

  if (status === "loading") {
    return (
      <ChangeViewPlaceholder
        resourcename="Operations profile details"
        infoview={ true }
      >
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputPlaceholder />
              <FormText color='muted'>
                Name of operations profile.
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        <ParagraphTitle title='States'/>
        <Row>
          <Col md={4}>
            <Table className="placeholder rounded" style={{ height: "200px" }} />
          </Col>
          <Col md={5}>
            <Table className="placeholder rounded" style={{ height: "200px" }} />
          </Col>
        </Row>
        <ParagraphTitle title='Operations'/>
        <Row>
          <Table className="placeholder rounded" style={{ height: "200px" }} />
        </Row>
      </ChangeViewPlaceholder>
    )
  }

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (profile)
    return (
      <BaseArgoView
        resourcename='Operations profile details'
        infoview={true}
      >
        <Form>
          <FormGroup>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupText>Name</InputGroupText>
                  <Input
                    type='text'
                    value={ profile.name }
                    data-testid='name'
                    className='form-control form-control-lg'
                    disabled={true}
                  />
                </InputGroup>
                <FormText color='muted'>
                  Name of operations profile.
                </FormText>
              </Col>
            </Row>
          </FormGroup>
          <ParagraphTitle title='States'/>
          <Row>
            <Col md={4}>
              <Table data-testid='tbl-states' bordered size='sm'>
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
              <Table data-testid='tbl-default' bordered>
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
              profile.operations.map((operation, oin) =>
                <Col md={5} key={oin}>
                  <h3 className='text-center'>{operation.name}</h3>
                  <Table data-testid={`tbl-operations-${operation.name}`} bordered size='sm'>
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
      </BaseArgoView>
    )
  else
    return null
}
