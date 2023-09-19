import React from "react";
import { Table, Form, Row } from "reactstrap";



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
          <CustomHeadline height="38.4px" width="528.71px" />
        :
          <div className="d-flex flex-row align-items-center justify-content-between placeholder-glow">
            <CustomHeadline height="38.4px" width="528.71px" />
            <CustomButton height="37.6px" width="54.85px" />
          </div>
        }
        <Form className="ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded">
          <CustomTable height="523px" />

          <Row className="d-flex flex-row align-items-center justify-content-center">
            <CustomButton custStyle="mx-1" height="37.6px" width="158.33px" />
            <CustomButton custStyle="mx-1" height="37.6px" width="180px" />
          </Row>
        </Form>
      </>
    );
};
