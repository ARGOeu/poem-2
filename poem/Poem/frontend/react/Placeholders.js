import React from "react";
import { 
  Button,
  Col, 
  Form, 
  FormGroup, 
  FormText, 
  Label,
  Row, 
  Table 
} from "reactstrap";
import { Footer } from "./UIElements";


export const CustomSpan = ({height, width, custStyle}) => (
  <span className={`placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
)

export const CustomHeadline = ({ height, width, custStyle }) => (
  <div className={`d-flex align-items-center justify-content-between placeholder-glow`}>
    <span className={`ms-3 mt-1 mb-4 placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
  </div>
);

export const CustomInput = ({ height, width, custStyle }) => (
  <span className={`placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
);

export const CustomSubtitle = ({ height, width, custStyle }) => (
  <h1 className={`mt-2 p-1 ps-3 text-uppercase placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
);

export const CustomTable = ({ height, width, custStyle }) => (
  <Table className={`placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
);

export const CustomButton = ({ height, width, custStyle }) => (
  <span className={`placeholder rounded ${custStyle}`} style={{ height: height, width: width }} />
);

export const CustomDescriptionArea = ({heightBottom, widthBottom, heightTable, widthTable, custStyle}) => (
  <div className={`d-flex flex-column ${custStyle}`}>
    <span className="placeholder rounded mt-3 mb-1" style={{ height: "15px", width: "13%" }} />
    <span className="placeholder rounded mb-1" style={{ height: heightTable, width: widthTable }} />
    <span className="placeholder rounded" style={{ height: heightBottom, width: widthBottom }} />
  </div>
);

export const CustomProfilesList = ({ pathname }) => {
    return (
      <>
        {
          pathname === "/ui/operationsprofiles" || 
          pathname === "/ui/metrics" || 
          pathname === "/ui/probes" || 
          pathname === "/ui/administration/probecandidates" || 
          pathname === "/ui/administration/metrictemplates" ||
          pathname === "/ui/administration/yumrepos" ||
          pathname === "/ui/administration/packages" ||
          pathname === "/ui/public_probes" ||
          pathname === "/ui/public_metrictemplates"
        ? 
          <CustomHeadline height="38.4px" width="500px" />
        :
          <div className="d-flex flex-row align-items-center justify-content-between placeholder-glow">
            <CustomHeadline height="38.4px" width="500px" />
            <CustomButton height="37.6px" width="54.85px" />
          </div>
        }
        <Form className="ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded">
          <CustomTable height="800px" />

          {pathname !== "/ui/administration/default_ports" ?
            <Row className="d-flex flex-row align-items-center justify-content-center">
              <CustomButton custStyle="mx-1" height="37.6px" width="158.33px" />
              <CustomButton custStyle="mx-1" height="37.6px" width="180px" />
            </Row>
              :
            <></>
          }
        </Form>
      </>
    );
};


const HeaderPlaceholder = () => 
  <span className="ms-3 mt-1 mb-4 placeholder placeholder-glow rounded" style={{ height: "45px", width: "500px" }} />


export const InputPlaceholder = ({ height="38px", width }) => 
  <span className="placeholder rounded" style={{ height: height, width: width }} />


const TextAreaPlaceholder = ({ width }) => 
  <span className="placeholder rounded" style={{ height: "152px", width: width }} />


const SubmitRowPlaceholder = () => 
  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5"></div>


export const ListViewPlaceholder = ({ resourcename, changeable=true, publicview=false, title, buttons }) => 
  <>
    <div className="d-flex align-items-center justify-content-between">
      {
        changeable ?
          <h2 className="ms-3 mt-1 mb-4">{ title ? title : `Select ${resourcename} to change`}</h2>
        :
          <h2 className='ms-3 mt-1 mb-4'>{`Select ${resourcename} for details`}</h2>
      }
      {
        buttons ? 
          buttons
        :
          !publicview && <Button color="secondary">Add</Button>
      }
    </div>
    <Form className="ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded">
      <Table className="placeholder rounded" style={{ height: "600px" }} />
    </Form>
    <Footer />
  </>


export const ChangeViewPlaceholder = ({ resourcename, infoview=false, addview=false, buttons, children }) => 
  <>
    <div className="d-flex align-items-center justify-content-between">
      {
        infoview ? 
          <h2 className="ms-3 mt-1 mb-4">{resourcename}</h2>
        :
          addview ?
            <h2 className="ms-3 mt-1 mb-4">{`Add ${resourcename}`}</h2>
          :
            <h2 className="ms-3 mt-1 mb-4">{`Change ${resourcename}`}</h2>
      }
      {
        buttons && buttons
      }
    </div>
    <Form className="ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded">
      { children }
    </Form>
    <SubmitRowPlaceholder />
    <Footer />
  </>


export const ProfileMainPlaceholder = ({ profiletype, description=undefined }) => 
  <FormGroup>
    <Row>
      <Col md={6}>
        <Row>
          <InputPlaceholder height="45px" width="100%"/>
        </Row>
        <Row>
          <FormText color='text-muted'>
            { `Name of ${profiletype} profile` }
          </FormText>
        </Row>
      </Col>
    </Row>
    {
      description &&
        <Row className='mt-3'>
          <Col md={10}>
            <Label>Description:</Label>
            <TextAreaPlaceholder width={"100%"} />
            <FormText color="muted">
              Free text description outlining the purpose of this profile.
            </FormText>
          </Col>
        </Row>
    }
    <Row className='mt-4'>
      <Col md={3}>
        <Row>
          <InputPlaceholder width="50%" />
        </Row>
        <Row>
          <FormText color="muted">
            { `${profiletype.charAt(0).toUpperCase() + profiletype.slice(1)} profile is member of given group.` }
          </FormText>
        </Row>
      </Col>
    </Row>
  </FormGroup>


export const VersionComparePlaceholder = () => 
  <>
    <HeaderPlaceholder />
    <Table className="placeholder rounded" style={{ height: "600px" }} />
    <Footer />
  </>


export const HistoryPlaceholder = () => 
  <>
    <div className="d-flex align-items-center justify-content-between">
      <h2 className="ms-3 mt-1 mb-4">Version history</h2>
    </div>
    <Table className="placeholder rounded" style={{ height: "400px" }} />
    <Footer />
  </>