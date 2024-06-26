import { Container, Row, Col } from "react-bootstrap";
import navIcon1 from "../assets/img/nav-icon1.svg";
import navIcon2 from "../assets/img/github.png";
import navIcon3 from "../assets/img/nav-icon3.svg";

export const Footer = () => {
  return (
    <footer className="footer">
      <Container>
        <Row className="align-items-center">
          <Col size={12} className="text-center text-sm-end">
            <div className="social-icon">
              <a href="https://github.com/YongkyA23">
                <img src={navIcon2} alt="Icon 2" />
              </a>
              <a href="https://www.linkedin.com/in/yongky-anthonychow/">
                <img src={navIcon1} alt="Icon 1" />
              </a>
              <a href="https://www.instagram.com/yongkyanthony_/">
                <img src={navIcon3} alt="Icon 3" />
              </a>
            </div>
            <p>Copyright 2024. All Rights Reserved</p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};
