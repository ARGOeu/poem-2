import React from 'react';
import { BaseArgoView } from './UIElements';
import {
  Table,
  Card,
  CardHeader,
  CardBody,
  CardFooter
} from 'reactstrap';

export const PrivacyPolicy = (props) => {
  let fqdn = window.location.hostname;

  return (
    <BaseArgoView
      resourcename='Privacy Policies'
      infoview={true}
    >
      <Card>
        <CardHeader>
          <h3 className='p-2'>Cookie Policies</h3>
        </CardHeader>
        <CardBody>
          <h4 className='p-3'>1. Purpose of this cookie policy</h4>
          <p>
            This Website uses technologies such as "cookies" and "pixel tags". By
            browsing the webpage, the User agrees to the creation and use of
            cookies.<br/>
            If User does not wish to consent to the use of cookies, User may either
            disable them or discontinue browsing this webpage.<br/>
            For the purpose of this Policy, the following terms shall have the
            following meaning:<br/>
          </p>
          <ul>
            <li>
              "Cookie" or "Cookies": Cookies are small text or message files sent from the
              server of an organization and stored on your computer. Cookies do not
              have access to data stored on your computer's hard disk or to Cookies
              placed by other websites, and they may not harm or damage your system.
            </li>
            <li>
              "Persistence cookies" remain during multiple website visits and get
              stored on your hard disk.
            </li>
            <li>
              "Session Cookies" are temporary cookies that disappear automatically
              after you leave a website;
            </li>
            <li>
              "Third Party Cookies" are cookies used by the websites of our partners,
              as integrated in our own Website or used by websites we link to.
            </li>
          </ul>

          <h4 className='p-3'>2. Which cookies are placed on your device when using our Website?</h4>
          <p>
            When you access and/or use the Website, we place one or more Cookies on
            your device for the purposes described herein. The following table and
            relevant information set out the cookies used for the Website. It also
            provides details of third parties setting cookies:
          </p>
          <Table responsive>
            <thead>
              <tr>
                <th>Cookie Type</th>
                <th>Cookie Provider</th>
                <th>Cookie Name</th>
                <th>Third party cookie</th>
                <th>Persistent or session Cookie</th>
                <th>Purpose of cookie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Session State</td>
                <td>{ fqdn }</td>
                <td>JSESSIONID</td>
                <td>No</td>
                <td>Session</td>
                <td>Preserve user session information</td>
              </tr>
            </tbody>
          </Table>

          <h4 className='p-3'>3. How long are cookies stored on your device?</h4>
            <p>
              The duration for which a cookie will be stored on your browsing device
              depends on whether it is a "persistence" or a "session" cookie. Session
              cookies will be stored on a device until you turn off your web
              browser.<br/>
              "Persistence cookies" shall remain on your device after you have finished
              browsing until they expire or until they are deleted by you.
            </p>

          <h4 className='p-3'>4. How can you disable cookies that have been placed on your device?</h4>
          <p>
            You can usually use your web browser to enable, disable, or delete
            cookies. To do so, follow the instructions provided for by your web
            browser (usually located in the "Help", "Tools" or "Edit" settings).<br/>
            You can also set your web browser to reject all cookies or to indicate
            when a cookie is being sent.
          </p>
        </CardBody>
        <CardFooter>
          <p className="font-italic">
            Cookies are important for identifying you, thereby enabling us to grant
            you access to the ARGO Monitoring service and other Infrastructure
          services and for optimizing your browsing experience.
          </p>
        </CardFooter>
      </Card>
    </BaseArgoView>
  )
}
