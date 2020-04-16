import React, { Component } from 'react';
import { ListOfMetrics, MetricForm, CompareMetrics } from './Metrics';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  HistoryComponent
} from './UIElements';
import { Formik, Form } from 'formik';
import { Button } from 'reactstrap';
import * as Yup from 'yup';
import { NotificationManager } from 'react-notifications';

export const MetricTemplateList = ListOfMetrics('metrictemplate');
export const TenantMetricTemplateList = ListOfMetrics('metrictemplate', true)

export const MetricTemplateChange = MetricTemplateComponent()
export const MetricTemplateClone = MetricTemplateComponent(true)

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


function MetricTemplateComponent(cloneview=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.name = props.match.params.name;
      this.location = props.location;
      this.addview = props.addview;
      this.tenantview = props.tenantview;
      this.history = props.history;
      this.backend = new Backend();

      this.state = {
        metrictemplate: {},
        probe: {},
        types: [],
        probeversions: [],
        metrictemplatelist: [],
        loading: false,
        popoverOpen: false,
        areYouSureModal: false,
        modalFunc: undefined,
        modalTitle: undefined,
        modalMsg: undefined
      };

      this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
      this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
      this.togglePopOver = this.togglePopOver.bind(this);
      this.onSelect = this.onSelect.bind(this);
      this.onSubmitHandle = this.onSubmitHandle.bind(this);
      this.doChange = this.doChange.bind(this);
      this.doDelete = this.doDelete.bind(this);
    }

    togglePopOver() {
      this.setState({
        popoverOpen: !this.state.popoverOpen
      });
    }

    toggleAreYouSure() {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal}));
    }

    toggleAreYouSureSetModal(msg, title, onyes) {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal,
          modalFunc: onyes,
          modalMsg: msg,
          modalTitle: title,
        }));
    }

    onSelect(field, value) {
      let metrictemplate = this.state.metrictemplate;
      metrictemplate[field] = value;
      this.setState({
        metrictemplate: metrictemplate
      });
    }

    onSubmitHandle(values, actions) {
      let msg = undefined;
      let title = undefined;

      if (this.addview || cloneview) {
        msg = 'Are you sure you want to add metric template?';
        title = 'Add metric template';
      } else {
        msg = 'Are you sure you want to change metric template?';
        title = 'Change metric template';
      }

      this.toggleAreYouSureSetModal(msg, title,
        () => this.doChange(values, actions))
    }

    async doChange(values, actions){
      if (this.addview || cloneview) {
        let cloned_from = undefined;
        if (cloneview) {
          cloned_from = values.id;
        } else {
          cloned_from = '';
        }
        let response = await this.backend.addObject(
          '/api/v2/internal/metrictemplates/',
          {
            cloned_from: cloned_from,
            name: values.name,
            probeversion: values.probeversion,
            mtype: values.type,
            description: values.description,
            probeexecutable: values.probeexecutable,
            parent: values.parent,
            config: values.config,
            attribute: values.attributes,
            dependency: values.dependency,
            parameter: values.parameter,
            flags: values.flags,
            files: values.file_attributes,
            fileparameter: values.file_parameters
          }
        );
        if (!response.ok) {
          let json = await response.json();
          NotificationManager.error(json.detail, 'Error');
        } else {
          NotifyOk({
            msg: 'Metric template successfully added',
            title: 'Added',
            callback: () => this.history.push('/ui/metrictemplates')
          });
        }
      } else {
        let response = await this.backend.changeObject(
          '/api/v2/internal/metrictemplates/',
          {
            id: values.id,
            name: values.name,
            probeversion: values.probeversion,
            mtype: values.type,
            description: values.description,
            probeexecutable: values.probeexecutable,
            parent: values.parent,
            config: values.config,
            attribute: values.attributes,
            dependency: values.dependency,
            parameter: values.parameter,
            flags: values.flags,
            files: values.file_attributes,
            fileparameter: values.file_parameters
          }
        );
        if (!response.ok) {
          let json = await response.json();
          NotificationManager.error(json.detail, 'Error');
        } else {
          NotifyOk({
            msg: 'Metric template successfully changed',
            title: 'Changed',
            callback: () => this.history.push('/ui/metrictemplates')
          });
        };
      };
    }

    async doDelete(name) {
      let response = await this.backend.deleteObject(`/api/v2/internal/metrictemplates/${name}`);
      if (response.ok)
        NotifyOk({
          msg: 'Metric template successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/metrictemplates')
        });
      else
        NotificationManager.error(`Error deleting metric template ${name}: ${response.status} ${response.statusText}`)
    }

    async componentDidMount() {
      this.setState({loading: true});

      let types = await this.backend.fetchData('/api/v2/internal/mttypes');
      let probeversions = await this.backend.fetchData('/api/v2/internal/version/probe');
      let metrictemplatelist = await this.backend.fetchData('/api/v2/internal/metrictemplates');
      let mlist = [];
      metrictemplatelist.forEach(e => mlist.push(e.name));

      if (!this.addview) {
        let metrictemplate = await this.backend.fetchData(`/api/v2/internal/metrictemplates/${this.name}`);
        if (metrictemplate.attribute.length === 0) {
          metrictemplate.attribute = [{'key': '', 'value': ''}];
        }
        if (metrictemplate.dependency.length === 0) {
          metrictemplate.dependency = [{'key': '', 'value': ''}];
        }
        if (metrictemplate.parameter.length === 0) {
          metrictemplate.parameter = [{'key': '', 'value': ''}];
        }
        if (metrictemplate.flags.length === 0) {
          metrictemplate.flags = [{'key': '', 'value': ''}];
        }
        if (metrictemplate.files.length === 0) {
          metrictemplate.files = [{'key': '', 'value': ''}];
        }
        if (metrictemplate.fileparameter.length === 0) {
          metrictemplate.fileparameter = [{'key': '', 'value': ''}];
        }

        if (metrictemplate.probeversion) {
          let probe = await this.backend.fetchData(`/api/v2/internal/version/probe/${metrictemplate.probeversion.split(' ')[0]}`);
          let fields = {};
          probe.forEach((e) => {
            if (e.object_repr === metrictemplate.probeversion) {
              fields = e.fields;
            }
          });
          this.setState({
            metrictemplate: metrictemplate,
            probe: fields,
            probeversions: probeversions,
            metrictemplatelist: mlist,
            types: types,
            loading: false,
          });
        } else {
          this.setState({
            metrictemplate: metrictemplate,
            metrictemplatelist: mlist,
            types: types,
            loading: false,
          });
        }
      } else {
        this.setState({
          metrictemplate: {
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
            fileparameter: [{'key': '', 'value': ''}]
          },
          metrictemplatelist: mlist,
          probeversions: probeversions,
          types: types,
          loading: false,
        });
      }
    }

    render() {
      const { metrictemplate, types, probeversions, metrictemplatelist, loading} = this.state;

      if (loading)
        return (<LoadingAnim/>)

      else if (!loading && metrictemplate) {
        return (
          <BaseArgoView
            resourcename={this.tenantview ? `${metrictemplate.name}` : 'metric template'}
            location={this.location}
            addview={this.addview}
            tenantview={this.tenantview}
            cloneview={cloneview}
            clone={true}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
          >
            <Formik
              initialValues = {{
                id: metrictemplate.id,
                name: metrictemplate.name,
                probeversion: metrictemplate.probeversion,
                type: metrictemplate.mtype,
                description: metrictemplate.description,
                probeexecutable: metrictemplate.probeexecutable,
                parent: metrictemplate.parent,
                config: metrictemplate.config,
                attributes: metrictemplate.attribute,
                dependency: metrictemplate.dependency,
                parameter: metrictemplate.parameter,
                flags: metrictemplate.flags,
                file_attributes: metrictemplate.files,
                file_parameters: metrictemplate.fileparameter
              }}
              onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
              validationSchema={MetricTemplateSchema}
              render = {props => (
                <Form>
                  <MetricForm
                    {...props}
                    obj='metrictemplate'
                    isTenantSchema={this.tenantview}
                    addview={this.addview}
                    state={this.state}
                    onSelect={this.onSelect}
                    togglePopOver={this.togglePopOver}
                    types={types}
                    probeversions={probeversions}
                    metrictemplatelist={metrictemplatelist}
                  />
                  {
                    (!this.tenantview) &&
                      <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                        {
                          (!this.addview && !cloneview) ?
                            <Button
                              color="danger"
                              onClick={() => {
                                this.toggleAreYouSureSetModal('Are you sure you want to delete Metric template?',
                                'Delete metric template',
                                () => this.doDelete(props.values.name))
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
        )
      } else {
        return null;
      }
    }
  }
}


export class MetricTemplateVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      probeversion: '',
      mtype: '',
      probeexecutable: '',
      parent: '',
      config: [],
      attribute: [],
      dependency: [],
      parameter: [],
      flags: [],
      files: [],
      fileparameter: [],
      loading: false
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    let json = await this.backend.fetchData(`/api/v2/internal/version/metrictemplate/${this.name}`);
    json.forEach((e) => {
      if (e.version == this.version)
        this.setState({
          name: e.fields.name,
          probeversion: e.fields.probeversion,
          type: e.fields.mtype,
          probeexecutable: e.fields.probeexecutable,
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
    });
  }

  render() {
    const { name, probeversion, type, probeexecutable, parent, config,
      attribute, dependency, parameter, flags, files, fileparameter,
      loading } = this.state;

    if (loading)
    return (<LoadingAnim/>);

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
                  obj='metrictemplate'
                  state={this.state}
                  isHistory={true}
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
