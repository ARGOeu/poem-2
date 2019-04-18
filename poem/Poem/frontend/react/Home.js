import React, { Component } from 'react';
import {
  Alert,
  Container,
  Button, 
  Row, 
  Col, 
  Card, 
  CardHeader, 
  CardBody,
  Label,
  CardFooter,
  FormGroup } from 'reactstrap';
import Cookies from 'universal-cookie'

const doLogout = () =>
{
  let cookies = new Cookies();

  return fetch('/rest-auth/logout/', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': cookies.get('csrftoken'),
      'Referer': 'same-origin'
    }});
}

const Home = props =>
  <Container>
    <Row>
      <Col>
      <h1>Home</h1>
      </Col>
    </Row>
    <Row>
      <Button color="danger" onClick={doLogout}>Logout</Button>
    </Row>
  </Container>

export default Home;

