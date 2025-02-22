import React, {
  Component,
  MouseEventHandler,
  MouseEvent,
  ReactElement,
} from "react";
import { Auth } from "@aws-amplify/auth";
import { I18n } from "@aws-amplify/core";
import { RestAPI } from "@aws-amplify/api-rest";
import { withRouter, RouteProps } from "react-router-dom";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import Tour from "reactour";
import { GrLogout } from "react-icons/gr";
import * as Sentry from "@sentry/react";
import { Slide, Dialog, Box, ThemeProvider } from "@mui/material";
import { strings } from "./libs/strings";
import BottomNav from "./components/BottomNav";
import { LanguageContext, LanguageProps } from "./state/LanguageContext";
import LoadingModal from "./components/LoadingModal";
import {
  getActiveSprintData,
  getInitialSprintData,
  putUpdatedSprintData,
} from "./state/sprints";
import {
  fetchUser,
  fetchStarterKitSanity,
  fetchStarterKitExperience,
  fetchCoaches,
  fetchCoachingRoster,
  fetchSanitySchemas,
} from "./libs/initialFetch";
import "toasted-notes/src/styles.css";
import LeftNav from "./components/LeftNav";
import { getUser } from "./state/profile";
import { errorToast } from "./libs/toasts";
import Routes from "./Routes";
import question from "./assets/help.png";
import Palette from "./containers/Palette";
import theme from "./libs/theme";
import { availableLanguages } from "./libs/languages";
import ws from "./libs/websocket";
import { User } from "./types";

const Transition = React.forwardRef(function Transition(
  {
    children,
    ...props
  }: {
    children: ReactElement<any, any>;
    props: any;
  },
  ref
) {
  return <Slide children={children} direction="up" ref={ref} {...props} />;
});

/**
 * This is the initial mount of the application, at the least the high level of it (index.js is the first load, excluding the index.html))
 * @TODO GitHub Issue #3
 * @TODO ChildProps Audit - Issue #5
 * @TODO Internalization Rerender - Issue #6
 */

const languageProps: LanguageProps = {
  language: null,
  setLanguage: () => {},
};

interface AppProps {
  location: RouteProps["location"];
  children: RouteProps["children"];
  getActiveSprintData: Function;
  getInitialSprintData: Function;
  putUpdatedSprintData: Function;
  getUser: Function;
  isAuthenticatd: boolean;
  history: Array<any>;
}

interface AppState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  username: string;
  user: User;
  training: object;
  product: object;
  interviewing: object;
  sprints: Array<any>;
  session: object;
  athletes: Array<any>;
  coaches: Array<any>;
  users: Array<User>;
  relationships: Array<any>;
  isTourOpen: boolean;
  loading: boolean;
  sanitySchemas: object;
  experiences: Array<any>;
  messages: Array<any>;
  chosenLanguage: object;
  sanityTraining: Array<any>;
  sanityProduct: Array<any>;
  sanityInterview: Array<any>;
}

class App extends Component<{}, AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = {
      isAuthenticated: false,
      isAuthenticating: true,
      username: "",
      user: {
        id: 8020,
        fName: "Vilfredo",
        lName: "Pareto",
        score: 0,
        email: "",
        github: "",
        missions: [],
        phone: "",
        percentage: 0,
        planning: [],
        instructor: false,
        review: "",
      },
      training: {},
      product: {},
      interviewing: {},
      sprints: [],
      session: {},
      athletes: [],
      coaches: [],
      // admin state
      users: [],
      relationships: [],
      isTourOpen: false,
      loading: false,
      sanitySchemas: {
        technicalSchemas: [],
        economicSchemas: [],
        hubSchemas: [],
      },
      experiences: [],
      messages: [],
      chosenLanguage: availableLanguages[0],
      sanityTraining: [],
      sanityProduct: [],
      sanityInterview: [],
    };
    // this.wsClient = "";
  }

  // initial websocket timeout duration as a class variable
  // eslint-disable-next-line react/no-unused-class-component-methods
  timeout = 5000;

  closeTour = () => {
    this.setState({
      isTourOpen: false,
    });
  };

  async componentDidMount() {
    this.setLoading();

    I18n.putVocabularies(strings);

    try {
      const session = await Auth.currentSession();
      const idToken = session.getIdToken();
      this.setState({
        username: idToken.payload.sub,
        session: session,
      });
      this.setState({ isAuthenticating: false });

      await this.initialFetch(idToken.payload.sub);
    } catch (e) {
      if (e === "No current user") {
        const result = await fetchSanitySchemas();
        if (result.success) {
          this.setState({ sanitySchemas: result.sanitySchemas }, () =>
            this.setCloseLoading()
          );
        } else {
          // TODO: If success === false, redirect to a page indicating a app error and to try again later (not the 404 not found page)
          this.setCloseLoading();
        }
      }
      if (e !== "No current user") {
        errorToast(e);
        this.setCloseLoading();
      }
    }
    this.setState({ isAuthenticating: false });
  }

  initialFetch = async (username: string) => {
    let newState = { isAuthenticated: false };
    const path = (this.props as AppProps).location?.pathname || "";

    // Set up variables to enable fetching only the data needed for your current app view
    const [context, training, arena] = [
      path.includes("context-builder"),
      path.includes("training"),
      !path.includes("context-builder") && !path.includes("training"),
    ];
    const firstFetch: Array<Function> = [];
    const secondFetch: Array<Function> = [];

    const userArray: Array<User> = (await fetchUser(username)) as Array<User>;
    if (userArray.length > 0) {
      const currentUser = userArray[0];
      try {
        (this.props as AppProps).getUser(currentUser);
        const stateUpdate = {
          user: currentUser,
          chosenLanguage: this.state.chosenLanguage,
        };
        if (currentUser.defaultLanguage) {
          const language = availableLanguages.find(
            (x) => x.code === currentUser.defaultLanguage
          );
          I18n.setLanguage(currentUser.defaultLanguage);
          if (language) stateUpdate.chosenLanguage = language;
        }
        this.setState(stateUpdate);

        // Sort fetching functions according to whether they should happen before or after the loading overlay goes away
        if (context) {
          firstFetch.push(fetchSanitySchemas);
          firstFetch.push(fetchStarterKitSanity);
        } else {
          secondFetch.push(fetchSanitySchemas);
          secondFetch.push(fetchStarterKitSanity);
        }
        if (training) {
          firstFetch.push(() => fetchStarterKitExperience(currentUser.id));
        } else {
          secondFetch.push(() => fetchStarterKitExperience(currentUser.id));
        }
        if (arena) {
          firstFetch.push(() => this.connectSocketToSprint(currentUser.id));
        } else {
          secondFetch.push(() => this.connectSocketToSprint(currentUser.id));
        }
        if (currentUser.instructor) {
          firstFetch.push(() => fetchCoachingRoster(currentUser.id.toString()));
        }
        firstFetch.push(() => fetchCoaches(currentUser.id.toString()));

        // Fetch first set of data
        const results = await Promise.all([...firstFetch.map((x) => x())]);

        results
          .filter((r) => r !== false)
          .forEach((item) => {
            const { success, ...rest } = item;
            if (success === true) {
              newState = { ...newState, ...rest };
            }
          });
        newState.isAuthenticated = true;
        this.setState({ ...newState }, () => this.setCloseLoading());
      } catch (e: any) {
        console.log(e.toString());
        if (e.toString() === "Error: Network Error") {
          console.log("Successfully identified network error");
        }
      }
    }
    try {
      // Fetch remaining content that will be needed in other areas of the app.
      let afterState = { loading: false };
      const afterResults = await Promise.all([...secondFetch.map((x) => x())]);
      afterResults
        .filter((r) => r !== false)
        .forEach((item) => {
          const { success, ...rest } = item;
          if (success === true) {
            afterState = { ...afterState, ...rest };
          }
        });
      this.setState({ ...afterState });
    } catch (e: any) {
      console.log(e.toString());
      if (e.toString() === "Error: Network Error") {
        console.log("Successfully identified network error");
      }
    }
  };

  connectSocketToSprint = async (userID = this.state.user.id) => {
    let result = { success: false, sprints: [] };
    try {
      const sprints = await RestAPI.get(
        "pareto",
        `/sprints/mentee/${userID}`,
        {}
      );
      result.success = true;
      result.sprints = await sprints;

      (this.props as AppProps).getInitialSprintData(sprints);
      this.setState({ sprints: sprints });

      if (sprints.length === 0) {
        return result;
      }
    } catch (e) {
      console.error(e);
    }

    let sprintStrings: Array<string> = [];

    result.sprints.map((spr: any, idx: number) => {
      sprintStrings.push(`key${idx}=${spr.id}`);
    });

    let sprintString = sprintStrings.join("&");

    let path = `${process.env.REACT_APP_WSS_ENDPOINT}?${sprintString}`;

    const processMsg = (message: MessageEvent) => {
      // console.log("Received data: ", JSON.parse(message.data));
      let tempSprintData = JSON.parse(message.data);
      // this check is to see whether the websocket connection successfully retrieved the latest state.
      // if there are too many extraneous connections, through ping error or otherwise - the function to distribute state across connections will fail
      if (!tempSprintData.message) {
        let newerSprintArray = this.state.sprints.slice();
        let tempVar = 0;
        for (let i = 0; i < this.state.sprints.length; i++) {
          if (this.state.sprints[i].id === tempSprintData.id) {
            tempVar = i;
            break;
          }
        }
        newerSprintArray[tempVar] = tempSprintData;
        try {
          // console.log("Formatted Sprint Array: ", newerSprintArray);
          this.setState({ sprints: newerSprintArray });
          (this.props as AppProps).putUpdatedSprintData(newerSprintArray);
        } catch (e) {
          // console.log("onmessage error", e);
        }
      } else {
        // alert(tempSprintData.message);
      }
    };

    ws.connect({ path, processMsg });
    return result;
  };

  fetchMenteeSprints = async (userId: string) => {
    try {
      let menteeSprints = await RestAPI.get(
        "pareto",
        `/sprints/mentee/${userId}`,
        {}
      );
      this.setState({ sprints: menteeSprints });
    } catch (e) {
      errorToast(e);
    }
  };

  userHasAuthenticated = (authenticated: boolean) => {
    this.setState({ isAuthenticated: authenticated });
  };

  refreshExperience = (type: string, updatedObject: object) => {
    if (type === "training") {
      this.setState({ training: updatedObject });
    } else if (type === "product") {
      this.setState({ product: updatedObject });
    } else if (type === "interviewing") {
      this.setState({ interviewing: updatedObject });
    }
  };

  handleLogout: MouseEventHandler = async (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    localStorage.removeItem("sanity");
    await Auth.signOut();
    this.userHasAuthenticated(false);
    (this.props as AppProps).history.push("/login");
  };

  setLoading = () => {
    this.setState({ loading: true });
  };

  setCloseLoading = () => {
    this.setState({ loading: false });
  };

  updateLanguage = ({
    name,
    code,
    image,
  }: {
    name: string;
    code: string;
    image: string;
  }) => {
    this.setState({ chosenLanguage: { name, code, image } });
  };

  render() {
    const OnboardingWithoutRouter = (props: any) => {
      const {
        showCloseButton,
        location: { pathname },
      } = props;
      const steps = [
        {
          selector: ".first-step",
          content: `${I18n.get("appFirst")}`,
        },
        {
          selector: ".second-step",
          content: `${I18n.get("appSecond")}`,
        },
        {
          selector: ".third-step",
          content: `${I18n.get("appThird")}`,
        },
        // {
        //   selector: ".fourth-step",
        //   content: `${I18n.get("appFourth")}`,
        // },
        {
          selector: ".fifth-step",
          content: `${I18n.get("appFifth")}`,
        },
        {
          selector: ".sixth-step",
          content: `${I18n.get("appSixth")}`,
        },
      ];
      return (
        <Tour
          steps={steps}
          isOpen={this.state.isTourOpen}
          onRequestClose={this.closeTour}
          showCloseButton={showCloseButton}
          update={pathname}
        />
      );
    };
    const Onboarding = withRouter(OnboardingWithoutRouter);
    const childProps = {
      // authentication related state
      isAuthenticated: this.state.isAuthenticated,
      userHasAuthenticated: this.userHasAuthenticated,
      username: this.state.username,
      user: this.state.user,
      session: this.state.session,
      setLoading: this.setLoading,
      setCloseLoading: this.setCloseLoading,
      chosenLanguage: this.state.chosenLanguage,
      connectSocket: this.connectSocketToSprint,

      // experience related state
      product: this.state.product,
      interviewing: this.state.interviewing,
      training: this.state.training,
      refreshExperience: this.refreshExperience,
      sanityTraining: this.state.sanityTraining,
      sanityInterview: this.state.sanityInterview,
      sanityProduct: this.state.sanityProduct,
      experiences: this.state.experiences,

      // sprint related state
      fetchMenteeSprints: this.fetchMenteeSprints,
      initialFetch: this.initialFetch,
      sprints: this.state.sprints,
      messages: this.state.messages,

      // assorted/unused state
      users: this.state.users,
      relationships: this.state.relationships,
      athletes: this.state.athletes,
      sanitySchemas: this.state.sanitySchemas,
      coaches: this.state.coaches,
    };
    languageProps.language = this.state.chosenLanguage;
    languageProps.setLanguage = this.updateLanguage;

    return (
      !this.state.isAuthenticating && (
        <ThemeProvider theme={theme}>
          <LanguageContext.Provider value={languageProps}>
            <Sentry.ErrorBoundary
              // eslint-disable-next-line no-unused-vars
              fallback={({ error, componentStack, resetError }) => (
                <>
                  <div>
                    Dear user, you have (sadly) encountered an error. The error
                    is written out for you below, but it's probably useless to
                    you. If you are just interested in moving past this
                    unfortunate incident, click the button below to reload the
                    page and start fresh.
                  </div>
                  <div>{error.toString()}</div>
                  <div>{componentStack}</div>
                  <button onClick={() => window.location.replace("/")}>
                    Click here to reset!
                  </button>
                </>
              )}
            >
              <Box
                sx={{
                  // width: "100vw",
                  // height: "100vh",
                  bgcolor: "background.default",
                  color: "text.primary",
                  // overflow: "scroll",
                  minHeight: "100vh",
                }}
              >
                {this.state.isAuthenticated ? (
                  <>
                    <div
                      className="sticky-logout"
                      style={{
                        filter: theme.palette.mode === "dark" ? "invert()" : "",
                      }}
                      onClick={this.handleLogout}
                    >
                      <GrLogout style={{ height: "20px" }} />
                    </div>

                    <div className="root-padding">
                      <LeftNav
                        chosenLanguage={this.state.chosenLanguage}
                        updateState={this.setState.bind(this)}
                        user={this.state.user}
                        athletes={this.state.athletes}
                      />

                      <Routes childProps={childProps} />
                    </div>
                    <Palette {...this.props} />
                    <div className="sticky-nav">
                      <div className="sticky-chat">
                        <img
                          src={question}
                          onClick={(event) => {
                            event.preventDefault();
                            this.setState({ isTourOpen: true });
                          }}
                          alt="Home page tour icon"
                          height="40"
                          width="40"
                          className="sticky-btn"
                          style={{
                            marginRight: 12,
                            cursor: "pointer",
                            filter: "grayscale(100%)",
                            outline: "2px solid white",
                            border: "2px solid transparent",
                            borderRadius: "50%",
                          }}
                        />
                      </div>
                      <div id="myBottomNav" className="bottom-nav">
                        <BottomNav user={this.state.user} />
                      </div>
                    </div>
                  </>
                ) : (
                  <Routes childProps={childProps} />
                )}
                <Onboarding showCloseButton />
                <Dialog
                  style={{
                    margin: "auto",
                  }}
                  open={this.state.loading}
                  TransitionComponent={Transition as any}
                  keepMounted
                  disableEscapeKeyDown
                  fullScreen
                  fullWidth
                  hideBackdrop={false}
                  aria-labelledby="loading"
                  aria-describedby="Please wait while the page loads"
                >
                  <LoadingModal />
                </Dialog>
              </Box>
            </Sentry.ErrorBoundary>
          </LanguageContext.Provider>
        </ThemeProvider>
      )
    );
  }
}

const mapStateToProps = (state: any) => ({
  redux: state.redux,
});

const mapDispatchToProps = (dispatch: any) =>
  bindActionCreators(
    {
      getActiveSprintData: (data) => getActiveSprintData(data),
      getInitialSprintData: (data) => getInitialSprintData(data),
      putUpdatedSprintData: (data) => putUpdatedSprintData(data),
      getUser: (data) => getUser(data),
    },
    dispatch
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(App as any));
