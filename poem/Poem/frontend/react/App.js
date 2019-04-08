import React, { Component } from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody} from 'reactstrap';

class App extends Component {
  render() {
    return (
        <Container>
            <Row>
                <Col sm={{size: 6, offset: 3}}>
                    <Card>
                        <CardHeader>Header</CardHeader>
                        <CardBody>Body</CardBody>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
  }
}

export default App;
