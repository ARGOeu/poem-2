import React, { Component } from 'react';
import { BaseArgoView } from './UIElements';

export const PrivacyPolicy = (props) =>
  <BaseArgoView
    resourcename='Privacy policies'
    infoview={true}
  >
    <h3 className='p-2'>Cookie Policies</h3>
    <hr/>

    <h4 className='p-2'>1. Purpose of this cookie policy</h4>
    <p>
      This Website uses technologies such as "cookies" and "pixel tags". By browsing the webpage, the User agrees to the creation and use of cookies.<br/>
      If User does not wish to consent to the use of cookies, User may either disable them or discontinue browsing this webpage.<br/>
      For the purpose of this Policy, the following terms shall have the following meaning:<br/>
    </p>
    <ul>
      <li>
        "Cookie" or "Cookies": Cookies are small text or message files sent from the
        server of an organization and stored on your computer. Cookies do not
        have access to data stored on your computer's hard disk or to Cookies
        placed by other websites, and they may not harm or damage your system.
      </li>
      <li>
        "Persistence cookies" remain during multiple website visits and get stored on your hard disk.
      </li>
      <li>
        "Session Cookies" are temporary cookies that disappear automatically after you leave a website;
      </li>
      <li>
        "Third Party Cookies" are cookies used by the websites of our partners, as integrated in our own Website or used by websites we link to.
      </li>
    </ul>
  </BaseArgoView>
