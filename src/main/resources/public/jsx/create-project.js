import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';

import { FormLayout, SectionBlock } from "./components/FormComponents"
import { mercator, ceoMapStyles } from "../js/mercator-openlayers.js";
import { utils } from "../js/utils.js";
import { SurveyDesign } from "./components/SurveyDesign"

class Project extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            projectDetails: null,
            templateId: "0",
            useTemplatePlots: false,
            imageryList: null,
            mapConfig: null,
            plotList: null,
            lonMin: "",
            latMin: "",
            lonMax: "",
            latMax: "",
            projectList: null,
        };
        this.setPrivacyLevel = this.setPrivacyLevel.bind(this);
        this.setTemplatePlots = this.setTemplatePlots.bind(this);
        this.setPlotDistribution = this.setPlotDistribution.bind(this);
        this.setPlotShape = this.setPlotShape.bind(this);
        this.setSampleDistribution = this.setSampleDistribution.bind(this);
        this.setBaseMapSource = this.setBaseMapSource.bind(this);
        this.showProjectMap = this.showProjectMap.bind(this);
        this.setProjectTemplate = this.setProjectTemplate.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.createProject = this.createProject.bind(this);

        this.setSurveyQuestions = this.setSurveyQuestions.bind(this);
    };

    componentDidMount() {
        // FIXME, combine promises to load map only once after all data is back
        this.getImageryList();
        this.getProjectById();
        this.getProjectList();
    }

    createProject() {
        if (confirm("Do you REALLY want to create this project?")) {
            utils.show_element("spinner");
            let formData = new FormData(document.getElementById("project-design-form"));
            formData.append("institution", this.props.institutionId);
            formData.append("sample-values", JSON.stringify(this.state.projectDetails.sampleValues));
            let ref = this;
            $.ajax({
                url: this.props.documentRoot + "/create-project",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
                data: formData
            }).fail(function () {
                utils.hide_element("spinner");
                alert("Error creating project. See console for details.");
            }).done(function (data) {
                if (parseInt(data)) {
                    let detailsNew = ref.state.projectDetails;
                    detailsNew.availability = "unpublished";
                    ref.setState({projectDetails: detailsNew});
                    utils.hide_element("spinner");
                    let newProjectId = data;
                    window.location = ref.props.documentRoot + "/review-project/" + newProjectId;
                } else {
                    utils.hide_element("spinner");
                    alert(data);
                }
            });
        }
    }

    convertSampleValuesToSurveyQuestions(sampleValues) {
        return sampleValues.map(sampleValue => {
            if (sampleValue.name && sampleValue.values) {
                const surveyQuestionAnswers = sampleValue.values.map(value => {
                    if (value.name) {
                        return {
                            id: value.id,
                            answer: value.name,
                            color: value.color
                        };
                    } else {
                        return value;
                    }
                });
                return {
                    id: sampleValue.id,
                    question: sampleValue.name,
                    answers: surveyQuestionAnswers,
                    parent_question: -1,
                    parent_answer: -1
                };
            } else {
                return sampleValue;
            }
        });
    }

    setProjectTemplate(event) {
        this.setState({templateId: event.target.value});
        const templateProject = this.state.projectList.find(p => p.id == event.target.value);
        
        const newSampleValues = this.convertSampleValuesToSurveyQuestions(templateProject.sampleValues);
        this.setState({projectDetails: {...templateProject, sampleValues: newSampleValues}});
        this.updateUnmanagedComponents(this.state.templateId);
    }

    setPrivacyLevel(privacyLevel) {
        this.setState({projectDetails: {...this.state.projectDetails, privacyLevel: privacyLevel}});
    }

    setBaseMapSource() {
        let e = document.getElementById("base-map-source");
        let bms = e.options[e.selectedIndex].value;
        let detailsNew = this.state.projectDetails;
        detailsNew.baseMapSource = bms;

        this.setState({projectDetails: detailsNew});
        mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource);
    }

    setTemplatePlots(useTemplatePlots) {
        this.setState({useTemplatePlots: useTemplatePlots});
    }

    setPlotDistribution(plotDistribution) {
        if (this.state.projectDetails != null) {
            let detailsNew = this.state.projectDetails;
            detailsNew.plotDistribution = plotDistribution;
            this.setState({projectDetails: detailsNew});
        }
    }

    setPlotShape(plotShape) {
        if (this.state.projectDetails != null) {
            let detailsNew = this.state.projectDetails;
            detailsNew.plotShape = plotShape;
            this.setState({projectDetails: detailsNew});
        }
    }

    setSampleDistribution(sampleDistribution) {
        if (this.state.projectDetails != null) {
            let detailsNew = this.state.projectDetails;
            detailsNew.sampleDistribution = sampleDistribution;
            this.setState({projectDetails: detailsNew});
        }
    }

    getProjectById() {
        const projectId = "0";
        fetch(this.props.documentRoot + "/get-project-by-id/" + projectId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                if (data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.state.documentRoot + "/home";
                } else {
                    this.setState({projectDetails: data});
                    this.updateUnmanagedComponents("0");
                }
            });
    }

    getProjectList() {
        const { userId } = this.props
        fetch(this.props.documentRoot + "/get-all-projects?userId=" + userId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the project list. See console for details.");
                }
            })
            .then(data => {

                this.setState({projectList: data});
                let projList = this.state.projectList;
                projList.unshift(JSON.parse(JSON.stringify(this.state.projectDetails)));
                this.setState({projectList: projList});
                this.updateUnmanagedComponents("0");
            });
    }

    getImageryList() {
        const { institutionId } = this.props
        fetch(this.props.documentRoot + "/get-all-imagery?institutionId=" + institutionId)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList: data});
            });
    }

    showPlotCenters(projectId, maxPlots) {
        fetch(this.props.documentRoot + "/get-project-plots/" + projectId + "/" + maxPlots)
            .then(response => {
                if (response.ok) {
                    return response.json()
                } else {
                    console.log(response);
                    alert("Error retrieving plot list. See console for details.");
                }
            })
            .then(data => {
                this.setState({plotList: data});
                mercator.addPlotOverviewLayers(this.state.mapConfig, this.state.plotList, this.state.details.plotShape);
            })
            .catch(e => this.setState({plotList: null}));
    }

    showProjectMap(projectId) {
        // Initialize the basemap
        if (this.state.mapConfig == null) {
            this.setState({mapConfig: mercator.createMap("project-map", [0.0, 0.0], 1, this.state.imageryList)});
        }

        mercator.setVisibleLayer(this.state.mapConfig, this.state.projectDetails.baseMapSource || this.state.imageryList[0].title);
        mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
        mercator.removeLayerByTitle(this.state.mapConfig, "flaggedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "analyzedPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "unanalyzedPlots");

        if (this.state.projectDetails.id == 0) {
            // Enable dragbox interaction if we are creating a new project
            let displayDragBoxBounds = function (dragBox) {
                let extent = dragBox.getGeometry().clone().transform("EPSG:3857", "EPSG:4326").getExtent();
                // FIXME: Can we just set this.lonMin/lonMax/latMin/latMax instead?
                document.getElementById("lon-min").value = extent[0];
                document.getElementById("lat-min").value = extent[1];
                document.getElementById("lon-max").value = extent[2];
                document.getElementById("lat-max").value = extent[3];
            };
            
            mercator.disableDragBoxDraw(this.state.mapConfig);
            mercator.enableDragBoxDraw(this.state.mapConfig, displayDragBoxBounds);
        } else {
            // Extract bounding box coordinates from the project boundary and show on the map
            let boundaryExtent = mercator.parseGeoJson(this.state.projectDetails.boundary, false).getExtent();
            // FIXME like above, these values are stored in the state but never used.
            this.setState({lonMin: boundaryExtent[0]});
            this.setState({latMin: boundaryExtent[1]});
            this.setState({lonMax: boundaryExtent[2]});
            this.setState({latMax: boundaryExtent[3]});

            // Display a bounding box with the project's AOI on the map and zoom to it
            mercator.removeLayerByTitle(this.state.mapConfig, "currentAOI");
            mercator.addVectorLayer(this.state.mapConfig,
                "currentAOI",
                mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.projectDetails.boundary, true)),
                ceoMapStyles.yellowPolygon);
            mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");

            // Get the new plotlist
            this.showPlotCenters(projectId, 300);
        }
    }

    updateUnmanagedComponents(projectId) {
        if (this.state.projectDetails != null) {
            if (this.state.imageryList && this.state.imageryList.length > 0) {
                this.showProjectMap(projectId);
            }
        }
    }

    handleChange(event) {
        let detailsNew = this.state.projectDetails;

        if (event.target.id == "project-name") {
            detailsNew.name = event.target.value;
        }
        else if (event.target.id = "project-description") {
            detailsNew.description = event.target.value;
        }
        this.setState({projectDetails: detailsNew});

    }

    setSurveyQuestions(newSurveyQuestions) {
        const newProjectDetails = {...this.state.projectDetails, 
                                    sampleValues: newSurveyQuestions}
        this.setState({projectDetails: newProjectDetails})
    }

    render() {
        return (
            <FormLayout id="project-design" title="Create Project">
                {this.state.projectDetails && 
                    <Fragment>
                        <ProjectDesignForm 
                            project={this.state}
                            setProjectTemplate={this.setProjectTemplate} 
                            setPrivacyLevel={this.setPrivacyLevel}
                            setSampleDistribution={this.setSampleDistribution}
                            setBaseMapSource={this.setBaseMapSource}
                            setPlotDistribution={this.setPlotDistribution} 
                            setPlotShape={this.setPlotShape}
                            setTemplatePlots={this.setTemplatePlots}
                            handleChange={this.handleChange}
                            setSurveyQuestions={this.setSurveyQuestions}
                        />
                        <ProjectManagement project={this.state} createProject={this.createProject} />
                    </Fragment>
                }
            </FormLayout>
        );
    }
}

function ProjectDesignForm(props) {
    return (
        <form id="project-design-form" className="px-2 pb-2" method="post"
              action={props.documentRoot + "/create-project"}
              encType="multipart/form-data">
        
                {props.project.projectList && 
                    <ProjectTemplateVisibility 
                        project={props.project} 
                        setProjectTemplate={props.setProjectTemplate} 
                    />
                }
                <ProjectInfo project={props.project} handleChange={props.handleChange}/>
                <ProjectVisibility project={props.project} setPrivacyLevel={props.setPrivacyLevel}/>
                <ProjectAOI project={props.project}/>
                {props.project.imageryList && 
                    <ProjectImagery project={props.project} setBaseMapSource={props.setBaseMapSource}/>
                }
                <PlotDesign 
                    project={props.project} 
                    useTemplatePlots={props.useTemplatePlots}
                    setPlotDistribution={props.setPlotDistribution}
                    setPlotShape={props.setPlotShape}
                    setTemplatePlots={props.setTemplatePlots}
                />
                {!props.project.useTemplatePlots && 
                    <SampleDesign project={props.project} setSampleDistribution={props.setSampleDistribution}/>
                }
                <SurveyDesign 
                    surveyQuestions={props.project.projectDetails.sampleValues} 
                    setSurveyQuestions={props.setSurveyQuestions} 
                />

        </form>
    );
}

function ProjectTemplateVisibility({ project, setProjectTemplate }) {
    return (
        <SectionBlock title = "Use Project Template (Optional)">
            <div id="project-template-selector">
                <div className="form-group">
                    <h3 htmlFor="project-template">Select Project</h3>
                    <select className="form-control form-control-sm" id="project-template"
                            name="project-template"
                            size="1" value={project.templateId} onChange={setProjectTemplate}>
                        {
                            project.projectList
                                .filter(proj => proj != null)
                                .map((proj,uid) =>
                                    <option key={uid} value={proj.id}>{proj.name}</option>
                                )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}


function ProjectInfo(props) {
    const { project: { projectDetails } } = props;
    return (
        <SectionBlock title="Project Info">
            <div id="project-info">
                <div className="form-group">
                    <h3 htmlFor="project-name">Name</h3>
                    <input className="form-control form-control-sm" type="text" id="project-name" name="name"
                        autoComplete="off" defaultValue={projectDetails.name}
                        onChange={props.handleChange}/>
                </div>
                <div className="form-group">
                    <h3 htmlFor="project-description">Description</h3>
                    <textarea className="form-control form-control-sm" id="project-description"
                            name="description"
                            value={projectDetails.description} onChange={props.handleChange}></textarea>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectVisibility({ project : { projectDetails : { privacyLevel } } }) {
    return (
        <SectionBlock title= "Project Visibility">
            <h3>Privacy Level</h3>
            <div id="project-visibility" className="mb-3 small">
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-public" name="privacy-level"
                            value="public" checked={privacyLevel === 'public'}
                            onChange={() => props.setPrivacyLevel('public')}/>
                    <label className="form-check-label" htmlFor="privacy-public">Public: <i>All Users</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-private" name="privacy-level"
                            value="private" onChange={() => props.setPrivacyLevel('private')}
                            checked={privacyLevel === 'private'}/>
                    <label className="form-check-label" htmlFor="privacy-private">Private: <i>Group
                        Admins</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-institution"
                            name="privacy-level"
                            value="institution" onChange={() => props.setPrivacyLevel('institution')}
                            checked={privacyLevel === 'institution'}/>
                    <label className="form-check-label" htmlFor="privacy-institution">Institution: <i>Group
                        Members</i></label>
                </div>
                <div className="form-check form-check-inline">
                    <input className="form-check-input" type="radio" id="privacy-invitation"
                            name="privacy-level"
                            value="invitation" onChange={() => props.setPrivacyLevel('invitation')} disabled
                            checked={privacyLevel === 'invitation'}/>
                    <label className="form-check-label" htmlFor="privacy-invitation">Invitation: <i>Coming
                        Soon</i></label>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectAOI({ project: { latMax, lonMin, lonMax, latMin } }) {
    return (
        <SectionBlock title="Project AOI">
            <div id="project-aoi">
                <div id="project-map">
                    <div className="col small text-center mb-2">Hold CTRL and click-and-drag a bounding box on the map</div>
                    <div className="form-group mx-4">
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lat-max" name="lat-max"
                                    defaultValue={latMax} placeholder="North" autoComplete="off" min="-90.0"
                                    max="90.0" step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lon-min" name="lon-min"
                                    defaultValue={lonMin} placeholder="West" autoComplete="off" min="-180.0"
                                    max="180.0" step="any"
                                />
                            </div>
                            <div className="col-md-6">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lon-max" name="lon-max"
                                    defaultValue={lonMax} placeholder="East" autoComplete="off" min="-180.0"
                                    max="180.0" step="any"
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-6 offset-md-3">
                                <input 
                                    className="form-control form-control-sm" type="number" id="lat-min" name="lat-min"
                                    defaultValue={latMin} placeholder="South" autoComplete="off" min="-90.0"
                                    max="90.0" step="any"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionBlock>
    );
}

function ProjectImagery({ project, setBaseMapSource }) {
    return (
        <SectionBlock title="Project Imagery">
            <div id="project-imagery">
                <div className="form-group">
                    <h3 htmlFor="base-map-source">Basemap Source</h3>
                    <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                        size="1"
                        value={project.projectDetails && project.projectDetails.baseMapSource != null
                            ? project.projectDetails.baseMapSource
                            : ""}
                        onChange={setBaseMapSource}>
                        {
                            project.imageryList.map((imagery, uid) =>
                                <option key={uid} value={imagery.title}>{imagery.title}</option>
                            )
                        }
                    </select>
                </div>
            </div>
        </SectionBlock>
    );
}

class PlotDesign extends React.Component {
  constructor(props) {
    super(props);
  }

  encodeImageFileAsURL(event) {
    let file = event.target.files[0];
    let reader = new FileReader();
    reader.onloadend = function() {
      let base64Data = reader.result;
      console.log("RESULT", base64Data);
    };
    reader.readAsDataURL(file);
  }

  render() {
    let {
      project: {
        useTemplatePlots,
        projectDetails,
        projectDetails: { plotDistribution, plotShape }
      }
    } = this.props;
    return (
      <SectionBlock title="Plot Design">
        <div id="plot-design">
          <div className="row">
            <div id="plot-design-col1" className="col">
              <h3>Template Plots</h3>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="use-template-plots"
                  name="use-template-plots"
                  defaultValue={useTemplatePlots}
                  onChange={() =>
                    this.props.setTemplatePlots(!useTemplatePlots)
                  }
                  checked={useTemplatePlots}
                />
                <label
                  className="form-check-label"
                  htmlFor="use-template-plots"
                >
                  Use Template Plots and Samples
                </label>
              </div>

              {!useTemplatePlots && (
                <Fragment>
                  <hr />
                  <h3 className="mb-3">Spatial Distribution</h3>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-random"
                      name="plot-distribution"
                      defaultValue="random"
                      onChange={() => this.props.setPlotDistribution("random")}
                      checked={plotDistribution === "random"}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="plot-distribution-random"
                    >
                      Random
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-gridded"
                      name="plot-distribution"
                      defaultValue="gridded"
                      onChange={() => this.props.setPlotDistribution("gridded")}
                      checked={plotDistribution === "gridded"}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="plot-distribution-gridded"
                    >
                      Gridded
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-csv"
                      name="plot-distribution"
                      defaultValue="csv"
                      onChange={() => this.props.setPlotDistribution("csv")}
                      checked={plotDistribution === "csv"}
                    />
                    <label
                      className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                      id="custom-csv-upload"
                    >
                      Upload CSV
                      <input
                        type="file"
                        accept="text/csv"
                        id="plot-distribution-csv-file"
                        defaultValue=""
                        name="plot-distribution-csv-file"
                        onChange={this.encodeImageFileAsURL}
                        style={{ display: "none" }}
                        disabled={plotDistribution != "csv"}
                      />
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-distribution-shp"
                      name="plot-distribution"
                      defaultValue="shp"
                      onChange={() => this.props.setPlotDistribution("shp")}
                      checked={plotDistribution === "shp"}
                    />
                    <label
                      className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                      id="custom-shp-upload"
                    >
                      Upload SHP
                      <input
                        type="file"
                        accept="application/zip"
                        id="plot-distribution-shp-file"
                        defaultValue=""
                        name="plot-distribution-shp-file"
                        onChange={this.encodeImageFileAsURL}
                        style={{ display: "none" }}
                        disabled={plotDistribution != "shp"}
                      />
                    </label>
                  </div>
                  <p id="plot-design-text" className="font-italic ml-2 small">-
                    {plotDistribution === "random" &&
                      "Plot centers will be randomly distributed within the AOI."}
                    {plotDistribution === "gridded" &&
                      "Plot centers will be arranged on a grid within the AOI using the plot spacing selected below."}
                    {plotDistribution === "csv" &&
                      "Specify your own plot centers by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID."}
                    {plotDistribution === "shp" &&
                      "Specify your own plot boundaries by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have a unique PLOTID field."}
                  </p>

                  <div className="form-group mb-3">
                    <label htmlFor="num-plots">Number of plots</label>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      id="num-plots"
                      name="num-plots"
                      autoComplete="off"
                      min="0"
                      step="1"
                      defaultValue={projectDetails.numPlots || ""}
                      disabled={plotDistribution != "random"}
                    />
                  </div>
                  <div className="form-group mb-1">
                    <label htmlFor="plot-spacing">Plot spacing (m)</label>
                    <input
                      className="form-control form-control-sm"
                      type="number"
                      id="plot-spacing"
                      name="plot-spacing"
                      autoComplete="off"
                      min="0.0"
                      step="any"
                      defaultValue={projectDetails.plotSpacing || ""}
                      disabled={plotDistribution != "gridded"}
                    />
                  </div>
                  <hr />
                  <h3>Plot Shape</h3>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-shape-circle"
                      name="plot-shape"
                      defaultValue="circle"
                      onChange={() => this.props.setPlotShape("circle")}
                      checked={plotShape === "circle"}
                      disabled={plotDistribution === "shp"}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="plot-shape-circle"
                    >
                      Circle
                    </label>
                  </div>
                  <div className="form-check form-check-inline">
                    <input
                      className="form-check-input"
                      type="radio"
                      id="plot-shape-square"
                      name="plot-shape"
                      defaultValue="square"
                      onChange={() => this.props.setPlotShape("square")}
                      checked={plotShape === "square"}
                      disabled={plotDistribution === "shp"}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="plot-shape-square"
                    >
                      Square
                    </label>
                  </div>
                  <br/>
                  <label htmlFor="plot-size" className="mt-3">
                    {plotShape == "circle" ? "Diameter (m)" : "Width (m)"}
                  </label>
                  <input
                    className="form-control form-control-sm"
                    type="number"
                    id="plot-size"
                    name="plot-size"
                    autoComplete="off"
                    min="0.0"
                    step="any"
                    defaultValue={projectDetails.plotSize}
                    disabled={plotDistribution === "shp"}
                  />
                </Fragment>
              )}
            </div>
          </div>
        </div>
      </SectionBlock>
    );
  }
}


class SampleDesign extends React.Component {
    constructor(props) {
        super(props);
    };
    encodeImageFileAsURL(event) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onloadend = function () {
            let base64Data = reader.result;
            console.log('RESULT', base64Data);
        };
        reader.readAsDataURL(file);
    }
    render() {
        const { project: { projectDetails: { plotDistribution, sampleDistribution, samplesPerPlot, sampleResolution } } } = this.props;
        return (
            <SectionBlock title="Sample Design">
                <div id="sample-design">
                    <h3>Spatial Distribution</h3>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" 
                            type="radio" 
                            id="sample-distribution-random"
                            name="sample-distribution" 
                            defaultValue="random"
                            onChange={() => this.props.setSampleDistribution('random')}
                            checked={sampleDistribution === 'random'}
                            disabled={plotDistribution === 'shp'}
                        />
                        <label className="form-check-label"
                            htmlFor="sample-distribution-random">
                            Random
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" 
                            type="radio" 
                            id="sample-distribution-gridded"
                            name="sample-distribution" 
                            defaultValue="gridded"
                            onChange={() => this.props.setSampleDistribution('gridded')}
                            checked={sampleDistribution === 'gridded'}
                            disabled={plotDistribution === 'shp'}
                        />
                        <label className="form-check-label"
                            htmlFor="sample-distribution-gridded">
                            Gridded
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" 
                            type="radio" 
                            id="sample-distribution-csv"
                            name="sample-distribution" 
                            defaultValue="csv"
                            onChange={() => this.props.setSampleDistribution('csv')}
                            checked={sampleDistribution === 'csv'}
                            disabled={plotDistribution === 'random' || plotDistribution === 'gridded'}
                        />
                        <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                            id="sample-custom-csv-upload"
                            htmlFor="sample-distribution-csv">
                            Upload CSV
                            <input 
                                type="file" 
                                accept="text/csv" 
                                id="sample-distribution-csv-file"
                                name="sample-distribution-csv-file"
                                defaultValue=""
                                onChange={this.encodeImageFileAsURL}
                                style={{ display: "none" }}
                                disabled={sampleDistribution != 'csv'}
                            />
                        </label>
                    </div>
                    <div className="form-check form-check-inline">
                        <input
                            className="form-check-input" 
                            type="radio" 
                            id="sample-distribution-shp"
                            name="sample-distribution" 
                            defaultValue="shp"
                            onChange={() => this.props.setSampleDistribution('shp')}
                            checked={sampleDistribution === 'shp'}
                            disabled={plotDistribution === 'random' || plotDistribution === 'gridded'}
                        />
                        <label className="btn btn-sm btn-block btn-outline-lightgreen btn-file py-0 my-0"
                            id="sample-custom-shp-upload"
                            htmlFor="sample-distribution-shp">
                            Upload SHP
                            <input
                                type="file" 
                                accept="application/zip" 
                                id="sample-distribution-shp-file"
                                name="sample-distribution-shp-file"
                                defaultValue=""
                                onChange={this.encodeImageFileAsURL}
                                style={{ display: "none" }}
                                disabled={sampleDistribution != 'shp'}
                            />
                        </label>
                    </div>
                    <p id="sample-design-text" className="font-italic ml-2 small">-
                        {sampleDistribution === 'random' &&
                            'Sample points will be randomly distributed within the plot boundary.'}
                        {sampleDistribution === 'gridded' &&
                            'Sample points will be arranged on a grid within the plot boundary using the sample resolution selected below.'}
                        {sampleDistribution === 'csv' &&
                            'Specify your own sample points by uploading a CSV with these fields: LONGITUDE,LATITUDE,PLOTID,SAMPLEID.'}
                        {sampleDistribution === 'shp' &&
                            'Specify your own sample shapes by uploading a zipped Shapefile (containing SHP, SHX, DBF, and PRJ files) of polygon features. Each feature must have PLOTID and SAMPLEID fields.'}
                    </p>
                    <div className="form-group mb-3">
                        <label htmlFor="samples-per-plot">Samples per plot</label>
                        <input
                            className="form-control form-control-sm" 
                            type="number" 
                            id="samples-per-plot"
                            name="samples-per-plot" 
                            autoComplete="off" 
                            min="0" 
                            step="1"
                            defaultValue={samplesPerPlot || ""}
                            disabled={sampleDistribution != 'random'}
                        />
                    </div>
                    <div className="form-group mb-1">
                        <label htmlFor="sample-resolution">Sample resolution (m)</label>
                        <input
                            className="form-control form-control-sm" 
                            type="number" 
                            id="sample-resolution"
                            name="sample-resolution" 
                            autoComplete="off" 
                            min="0.0" 
                            step="any"
                            defaultValue={sampleResolution || ""}
                            disabled={sampleDistribution != 'gridded'}
                        />
                    </div>
                </div>
            </SectionBlock>
        );
    }
}

function ProjectManagement(props) {
    return (
        <SectionBlock title="Project Management">
            <div id="project-management">
                <div className="row">
                    <input type="button" id="create-project" className="btn btn-outline-danger btn-sm btn-block"
                        name="create-project" value="Create Project"
                        onClick={props.createProject}/>
                    <div id="spinner"></div>
                </div>
            </div>
        </SectionBlock>
    );
}

export function renderCreateProjectPage(args) {
    ReactDOM.render(
        <Project 
            documentRoot={args.documentRoot} 
            userId={args.userId} 
            institutionId={args.institutionId}
        />,
        document.getElementById("project")
    );
}