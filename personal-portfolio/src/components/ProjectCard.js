import React from "react";
import { Col } from "react-bootstrap";

export const ProjectCard = ({
  title,
  description,
  imgUrl,
  gitUrl,
  liveUrl,
}) => {
  return (
    <Col sm={6} md={4}>
      <div className="proj-imgbx">
        <img src={imgUrl} alt={title} />
        <div className="proj-txtx">
          <h4>{title}</h4>
          <span>{description}</span>
          <br />
          {gitUrl && (
            <a
              className="github-link"
              href={gitUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub <i className="fas fa-external-link-square-alt"></i>
            </a>
          )}
          {liveUrl && (
            <a
              className="live-link"
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Live <i className="fas fa-external-link-square-alt"></i>
            </a>
          )}
        </div>
      </div>
    </Col>
  );
};
