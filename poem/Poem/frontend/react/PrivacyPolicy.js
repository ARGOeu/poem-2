import React from 'react';
import { BaseArgoView } from './UIElements';
import {
  Table
} from 'reactstrap';

export const PrivacyPolicy = (props) =>
  <BaseArgoView
    resourcename='Privacy policies'
    infoview={true}
  >
    <h3 className='p-2'>Cookie Policies</h3>
    <hr/>

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
          <td>argo.egi.eu</td>
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
  </BaseArgoView>
