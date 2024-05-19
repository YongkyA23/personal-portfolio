import { Container, Row, Col, Tab, Nav } from "react-bootstrap";
import { ProjectCard } from "./ProjectCard";
import projImg1 from "../assets/img/image01.jpg";
import projImg2 from "../assets/img/image02.jpg";
import projImg3 from "../assets/img/prj3.png";
import projImg4 from "../assets/img/image04.jpg";
import projImg5 from "../assets/img/image05.jpg";
import projImg6 from "../assets/img/image06.png";
import projImg7 from "../assets/img/victu.png";
import colorSharp2 from "../assets/img/color-sharp2.png";
import "animate.css";
import TrackVisibility from "react-on-screen";

export const Projects = () => {
  const webProjects = [
    {
      title: "wa.me Link Generator",
      description: "Web Development using React",
      imgUrl: projImg3,
      gitUrl: "https://github.com/YongkyA23/wa-me-gen",
      liveUrl: "https://wa-link.vercel.app/",
    },
    {
      title: "Java Cashier App",
      description: "Java App Development",
      imgUrl: projImg1,
      gitUrl: "https://github.com/YongkyA23/Cashier-App-Java",
    },
    {
      title: "Ticks",
      description: "Web Development using HTML, CSS and JS",
      imgUrl: projImg2,
      gitUrl: "https://github.com/YongkyA23/ticks",
    },
    {
      title: "Artisan Avenue",
      description: "Web Development using HTML, CSS and JS",
      imgUrl: projImg4,
      gitUrl: "https://github.com/YongkyA23/artisan-avenue",
    },
    {
      title: "Wyeth S26 Ultima Business Presentation",
      description: "Web Based Business Presentation Development",
      imgUrl: projImg5,
    },
    {
      title: "Computer Store Website",
      description: "Ecommerce Web using Wordpress CMS",
      imgUrl: projImg6,
    },
  ];

  const uiProjects = [
    {
      title: "Victu",
      description: "App Prototype Design",
      imgUrl: projImg7,
    },
  ];

  return (
    <section className="project" id="projects">
      <Container>
        <Row>
          <Col size={12}>
            <TrackVisibility>
              <div>
                <h2>Projects</h2>
                <p>
                  Showcase of my web development projects that highlight my
                  skills and creativity. Each project demonstrates my commitment
                  to delivering high-quality, user-friendly solutions with sleek
                  designs and seamless functionality.
                </p>
                <Tab.Container id="projects-tabs" defaultActiveKey="first">
                  <Nav
                    variant="pills"
                    className="nav-pills mb-5 justify-content-center align-items-center"
                    id="pills-tab"
                  >
                    <Nav.Item>
                      <Nav.Link eventKey="first">Web Development</Nav.Link>
                    </Nav.Item>

                    <Nav.Item>
                      <Nav.Link eventKey="second">UI/UX Development</Nav.Link>
                    </Nav.Item>
                  </Nav>
                  <Tab.Content>
                    <Tab.Pane eventKey="first">
                      <Row>
                        {webProjects.map((project, index) => {
                          return <ProjectCard key={index} {...project} />;
                        })}
                      </Row>
                    </Tab.Pane>
                    <Tab.Pane eventKey="second">
                      <Row>
                        {uiProjects.map((project, index) => {
                          return <ProjectCard key={index} {...project} />;
                        })}
                      </Row>
                    </Tab.Pane>
                  </Tab.Content>
                </Tab.Container>
              </div>
            </TrackVisibility>
          </Col>
        </Row>
      </Container>
      <img className="background-image-right" src={colorSharp2}></img>
    </section>
  );
};
