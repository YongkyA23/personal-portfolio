import React from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import "react-circular-progressbar/dist/styles.css";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import colorSharp from "../assets/img/color-sharp.png";

export const Skills = () => {
  const responsive = {
    superLargeDesktop: {
      breakpoint: { max: 4000, min: 3000 },
      items: 5,
    },
    desktop: {
      breakpoint: { max: 3000, min: 1024 },
      items: 4,
    },
    tablet: {
      breakpoint: { max: 1024, min: 464 },
      items: 2,
    },
    mobile: {
      breakpoint: { max: 464, min: 0 },
      items: 1,
    },
  };

  const skills = [
    { name: "HTML", level: 90 },
    { name: "MYSQL", level: 80 },
    { name: "Java", level: 70 },
    { name: "Javascript", level: 65 },
    { name: "CSS", level: 60 },
    { name: "Figma", level: 60 },
    { name: "Linux", level: 50 },
    { name: "React", level: 50 },
  ];

  return (
    <section className="skill" id="skills">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="skill-bx wow zoomIn">
              <h2 className="pb-4">Skills</h2>
              <Carousel
                responsive={responsive}
                infinite={true}
                keyBoardControl={true}
                className="owl-carousel owl-theme skill-slider"
              >
                {skills.map((skill, index) => (
                  <div className="item" key={index}>
                    <div
                      className="circular-skill"
                      style={{ width: 150, height: 200 }}
                    >
                      <CircularProgressbar
                        value={skill.level}
                        text={`${skill.level}%`}
                        styles={buildStyles({
                          textColor: "#fff",
                          pathColor: "#5d29ae",
                          trailColor: "#393e46",
                        })}
                      />
                      <h5 className="mt-3">{skill.name}</h5>
                    </div>
                  </div>
                ))}
              </Carousel>
            </div>
          </div>
        </div>
      </div>
      <img className="background-image-left" src={colorSharp} alt="Image" />
    </section>
  );
};
