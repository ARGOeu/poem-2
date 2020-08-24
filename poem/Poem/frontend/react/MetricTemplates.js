import React, { Component, useState } from 'react';
import { MetricForm, CompareMetrics } from './Metrics';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  HistoryComponent,
  NotifyError,
  NotifyWarn,
  ErrorComponent,
  ModalAreYouSure
} from './UIElements';
import { Formik, Form } from 'formik';
import { Button } from 'reactstrap';
import * as Yup from 'yup';
import { useQuery, queryCache } from 'react-query';

export const MetricTemplateHistory = HistoryComponent('metrictemplate');
export const TenantMetricTemplateHistory = HistoryComponent('metrictemplate', true);

export const MetricTemplateVersionCompare = CompareMetrics('metrictemplate');


const MetricTemplateSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  type: Yup.string(),
  probeversion: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  }),
  probeexecutable: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: Yup.string().required('Required')
  })
});


export const MetricTemplateComponent = (props) => {
  const probeview = props.probeview;

  var name = undefined;
  if (probeview)
    name = props.match.params.metrictemplatename;
  else
    name = props.match.params.name;

  const location = props.location;
  const addview = props.addview;
  const cloneview = props.cloneview;
  const publicView = props.publicView;
  const tenantview = props.tenantview;
  const history = props.history;
  const querykey = `metrictemplate_${addview ? 'addview' : `${name}_${tenantview ? 'tenant_' : ''}${cloneview ? 'cloneview' : `${publicView ? 'publicview' : 'changeview'}`}`}`;

  const backend = new Backend();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const { data: types, error: typesError, isLoading: typesLoading } = useQuery(
    `${querykey}_types`, async () => {
      let types = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}mttypes`);
      return types;
    }
  );

  const { data: allTags, error: allTagsError, isLoading: allTagsLoading } = useQuery(
    `${querykey}_tags`, async () => {
      let tags = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictags`);
      let formatTags = [];
      tags.forEach(t => formatTags.push({value: t, label: t}));
      return formatTags;
    }
  );

  const { data: allProbeVersions, error: allProbeVersionsError, isLoading: allProbeVersionsLoading } = useQuery(
    `${querykey}_allprobeversions`, async () => {
      let allprobeversions = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe`);
      return allprobeversions;
    }
  );

  const { data: listMetricTemplates, error: listMetricTemplatesError, isLoading: listMetricTemplatesLoading } = useQuery(
    `${querykey}_metrictemplates`, async () => {
      let mts = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates`);
      let mtlist = [];
      mts.forEach(m => mtlist.push(m.name));
      return mtlist;
    }
  );

  const {data: metricTemplate, error: metricTemplateError, isLoading: metricTemplateLoading } = useQuery(
    `${querykey}_metrictemplate`,
    async () => {
      let metrictemplate = {
        id: '',
        name: '',
        probeversion: '',
        mtype: 'Active',
        description: '',
        probeexecutable: '',
        parent: '',
        config: [
          {'key': 'maxCheckAttempts', 'value': ''},
          {'key': 'timeout', 'value': ''},
          {'key': 'path', 'value': ''},
          {'key': 'interval', 'value': ''},
          {'key': 'retryInterval', 'value': ''}
        ],
        attribute: [{'key': '', 'value': ''}],
        dependency: [{'key': '', 'value': ''}],
        parameter: [{'key': '', 'value': ''}],
        flags: [{'key': '', 'value': ''}],
        files: [{'key': '', 'value': ''}],
        fileparameter: [{'key': '', 'value': ''}],
        tags: [],
        probe: {}
      };

      if (!addview) {
        metrictemplate = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates/${name}`);

        let tags = []
        metrictemplate.tags.forEach(t => tags.push({value: t, label: t}));
        metrictemplate.tags = tags;

        if (metrictemplate.probeversion) {
          let probe = {};
          allProbeVersions.forEach(pv => {
            if (pv.object_repr === metrictemplate.probeversion)
              probe = pv.fields;
              metrictemplate.probe = probe;
          });
        };

        if (metrictemplate.attribute.length === 0)
          metrictemplate.attribute = [{'key': '', 'value': ''}];

        if (metrictemplate.dependency.length === 0)
          metrictemplate.dependency = [{'key': '', 'value': ''}];
        if (metrictemplate.parameter.length === 0)
          metrictemplate.parameter = [{'key': '', 'value': ''}];

        if (metrictemplate.flags.length === 0)
          metrictemplate.flags = [{'key': '', 'value': ''}];

        if (metrictemplate.files.length === 0)
          metrictemplate.files = [{'key': '', 'value': ''}];

        if (metrictemplate.fileparameter.length === 0)
          metrictemplate.fileparameter = [{'key': '', 'value': ''}];
        };

      return metrictemplate;
    },
    { enabled: allProbeVersions, }
  );

  function onSelect(field, value) {
    if (field === 'probeversion') {
      let metrictemplate = metricTemplate;
      let probe = {};
      for (let probeversion of allProbeVersions) {
        if (probeversion.object_repr === value) {
          probe = probeversion.fields;
          break;
        } else {
          probe = {'package': ''};
        }
      };
      metrictemplate.probe = probe;
      queryCache.setQueryData('mt_changeview_metrictemplate', () => metrictemplate);
    };
  };

  function onTagChange(value) {
    let metrictemplate = metricTemplate;
    metrictemplate.tags = value;
    queryCache.setQueryData('mt_changeview_metrictemplate', () => metrictemplate);
  };

  function togglePopOver() {
    setPopoverOpen(!popoverOpen);
  };

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  };

  function onSubmitHandle(values, actions) {
    setModalMsg(`Are you sure you want to ${addview || cloneview ? 'add' : 'change'} metric template?`)
    setModalTitle(`${addview || cloneview ? 'Add' : 'Change'} metric template`)
    setModalFlag('submit');
    setFormValues(values);
    toggleAreYouSure();
  };

  async function doChange() {
    function onlyUnique(value, index, self) {
      return self.indexOf(value) == index;
    };

    let tagNames = [];
    metricTemplate.tags.forEach(t => tagNames.push(t.value));
    let unique = tagNames.filter( onlyUnique );

    if (addview || cloneview) {
      let cloned_from = undefined;
      if (cloneview) {
        cloned_from = formValues.id;
      } else {
        cloned_from = '';
      }

      let response = await backend.addObject(
        '/api/v2/internal/metrictemplates/',
        {
          cloned_from: cloned_from,
          name: formValues.name,
          probeversion: formValues.probeversion,
          mtype: formValues.type,
          tags: unique,
          description: formValues.description,
          probeexecutable: formValues.probeexecutable,
          parent: formValues.parent,
          config: formValues.config,
          attribute: formValues.attributes,
          dependency: formValues.dependency,
          parameter: formValues.parameter,
          flags: formValues.flags,
          files: formValues.file_attributes,
          fileparameter: formValues.file_parameters
        }
      );

      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = json.detail;
        } catch(err) {
          add_msg = 'Error adding metric template';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        NotifyOk({
          msg: 'Metric template successfully added',
          title: 'Added',
          callback: () => history.push('/ui/metrictemplates')
        });
      };
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/metrictemplates/',
        {
          id: formValues.id,
          name: formValues.name,
          probeversion: formValues.probeversion,
          mtype: formValues.type,
          tags: unique,
          description: formValues.description,
          probeexecutable: formValues.probeexecutable,
          parent: formValues.parent,
          config: formValues.config,
          attribute: formValues.attributes,
          dependency: formValues.dependency,
          parameter: formValues.parameter,
          flags: formValues.flags,
          files: formValues.file_attributes,
          fileparameter: formValues.file_parameters
        }
      );

      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = json.detail;
        } catch(err) {
          change_msg = 'Error changing metric template';
        };
        (response.status == '418') ?
          NotifyWarn({
            title: `Warning: ${response.status} ${response.statusText}`,
            msg: change_msg
          })
        :
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: change_msg
          })
      } else {
        NotifyOk({
          msg: 'Metric template successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/metrictemplates')
        });
      };
    };
  };

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/metrictemplates/${name}`);
    if (response.ok)
      NotifyOk({
        msg: 'Metric template successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/metrictemplates')
      });
    else {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting metric template';
      };
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    };
  };

  if ((!addview && metricTemplateLoading) || typesLoading || allTagsLoading || allProbeVersionsLoading || listMetricTemplatesLoading)
    return (<LoadingAnim/>)

  else if (!addview && metricTemplateError)
    return (<ErrorComponent error={metricTemplateError.message}/>);

  else if (typesError)
    return (<ErrorComponent error={typesError.message}/>);

  else if (allTagsError)
    return (<ErrorComponent error={allTagsError.message}/>);

  else if (allProbeVersionsError)
    return (<ErrorComponent error={allProbeVersionsError.message}/>);

  else if (listMetricTemplatesError)
    return (<ErrorComponent error={listMetricTemplatesError.message}/>);

  else {
    var probeVersionsNames = [];
    allProbeVersions.forEach(pv => probeVersionsNames.push(pv.object_repr));

    return (
      <React.Fragment>
        <ModalAreYouSure
          isOpen={areYouSureModal}
          toggle={toggleAreYouSure}
          title={modalTitle}
          msg={modalMsg}
          onYes={modalFlag === 'submit' ? doChange : modalFlag === 'delete' ? doDelete : undefined}
        />
        <BaseArgoView
          resourcename={(tenantview || publicView) ? 'Metric template details' : 'metric template'}
          location={location}
          addview={addview}
          tenantview={tenantview}
          publicview={publicView}
          history={!probeview}
          cloneview={cloneview}
          clone={!publicView}
          modal={false}
        >
          <Formik
            initialValues = {{
              id: metricTemplate.id,
              name: metricTemplate.name,
              probeversion: metricTemplate.probeversion,
              type: metricTemplate.mtype,
              description: metricTemplate.description,
              probeexecutable: metricTemplate.probeexecutable,
              parent: metricTemplate.parent,
              config: metricTemplate.config,
              attributes: metricTemplate.attribute,
              dependency: metricTemplate.dependency,
              parameter: metricTemplate.parameter,
              flags: metricTemplate.flags,
              file_attributes: metricTemplate.files,
              file_parameters: metricTemplate.fileparameter
            }}
            onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
            validationSchema={MetricTemplateSchema}
            render = {props => (
              <Form>
                <MetricForm
                  {...props}
                  obj_label='metrictemplate'
                  obj={metricTemplate}
                  probe={metricTemplate.probe}
                  isTenantSchema={tenantview}
                  publicView={publicView}
                  addview={addview}
                  onSelect={onSelect}
                  popoverOpen={popoverOpen}
                  togglePopOver={togglePopOver}
                  onTagChange={onTagChange}
                  types={types}
                  alltags={allTags}
                  tags={metricTemplate.tags}
                  probeversions={probeVersionsNames}
                  metrictemplatelist={listMetricTemplates}
                />
                {
                  (!tenantview && !publicView) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      {
                        (!addview && !cloneview) ?
                          <Button
                            color="danger"
                            onClick={() => {
                              setModalMsg('Are you sure you want to delete metric template?');
                              setModalTitle('Delete metric template');
                              setModalFlag('delete');
                              toggleAreYouSure();
                            }}
                          >
                            Delete
                          </Button>
                        :
                          <div></div>
                      }
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      </React.Fragment>
    );
  };
};


export class MetricTemplateVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;
    this.publicView = props.publicView;

    this.backend = new Backend();

    this.state = {
      name: '',
      probeversion: '',
      probe: {'package': ''},
      mtype: '',
      probeexecutable: '',
      parent: '',
      description: '',
      config: [],
      attribute: [],
      dependency: [],
      parameter: [],
      flags: [],
      files: [],
      fileparameter: [],
      loading: false,
      error: null
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
      let json = await this.backend.fetchData(`/api/v2/internal/${this.publicView ? 'public_' : ''}version/metrictemplate/${this.name}`);
      json.forEach(async (e) => {
        if (e.version == this.version) {
          let probes = await this.backend.fetchData(`/api/v2/internal/${this.publicView ? 'public_' : ''}version/probe/${e.fields.probeversion.split(' ')[0]}`);
          let probe = {};
          probes.forEach(p => {
            if (p.object_repr === e.fields.probeversion)
              probe = p.fields;
          });
          this.setState({
            name: e.fields.name,
            probeversion: e.fields.probeversion,
            probe: probe,
            type: e.fields.mtype,
            tags: e.fields.tags,
            probeexecutable: e.fields.probeexecutable,
            description: e.fields.description,
            parent: e.fields.parent,
            config: e.fields.config,
            attribute: e.fields.attribute,
            dependency: e.fields.dependency,
            parameter: e.fields.parameter,
            flags: e.fields.flags,
            files: e.fields.files,
            fileparameter: e.fields.fileparameter,
            date_created: e.date_created,
            loading: false
          });
        }
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  }

  render() {
    const { name, probeversion, type, probeexecutable, parent, config,
      attribute, dependency, parameter, flags, files, fileparameter,
      loading, description, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading && name) {
      return (
        <BaseArgoView
          resourcename={`${name} ${probeversion && `[${probeversion}]`}`}
          infoview={true}
        >
          <Formik
            initialValues = {{
              name: name,
              probeversion: probeversion,
              type: type,
              probeexecutable: probeexecutable,
              description: description,
              parent: parent,
              config: config,
              attributes: attribute,
              dependency: dependency,
              parameter: parameter,
              flags: flags,
              file_attributes: files,
              file_parameters: fileparameter
            }}
            render = {props => (
              <Form>
                <MetricForm
                  {...props}
                  obj_label='metrictemplate'
                  isHistory={true}
                  probe={this.state.probe}
                  tags={this.state.tags}
                />
              </Form>
            )}
          />
        </BaseArgoView>
      )
    }
    else
      return null
  }
}
