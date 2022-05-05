import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import FormGroup from "react-bootstrap/lib/FormGroup";
import ControlLabel from "react-bootstrap/lib/ControlLabel";
import FormControl from "react-bootstrap/lib/FormControl";
import { RestAPI } from "@aws-amplify/api-rest";
import { I18n } from "@aws-amplify/core";
import { useSelector } from "react-redux";
import { FaTimes } from "react-icons/fa";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Calendar from "react-calendar";
import cloneDeep from "lodash.clonedeep";
import { errorToast, successToast } from "../libs/toasts";
import LoaderButton from "../components/LoaderButton";
import "react-calendar/dist/Calendar.css";

/**
 * Returns max date that the user will be allowed to
 * create a sprint for. Returns date 90 days
 * in the future.
 * @returns {Date} futureDate
 */
function getCalendarMaxDate() {
  const numberOfDaysInFutureAllowed = 90;
  return new Date(
    Date.now() + numberOfDaysInFutureAllowed * 24 * 60 * 60 * 1000
  );
}

/**
 * This is the component where a user creates a new sprint, and selects which players are competing.
 * @TODO Re-integrate 'validateForm' functtion, to prevent people from selecting days in the past. Rethink what other purposes this could have.
 */
function SprintCreation(props) {
  const profile = useSelector((state) => state.profile);
  const [startDate, setStartDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [missions, setMissions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [chosenMissions, setChosenMissions] = useState(null);
  const [chosenPlayers, setChosenPlayers] = useState([]);

  useEffect(() => {
    getConfiguration();
  }, []);

  async function getConfiguration() {
    setLoading(true);
    let options = await RestAPI.get("pareto", "/templates");
    let userOptions = await RestAPI.get("pareto", "/users");
    setMissions(options);
    setPlayers(userOptions.filter((e) => e.id !== profile.id));
    setLoading(false);
    setLoaded(true);
  }

  async function createSprint() {
    setLoading(true);
    const validateFormResult = validateForm();
    if (!validateFormResult.isValid) {
      return setLoading(false);
    }
    let dbMission;
    let databasedMissions = [];
    chosenMissions.missions.forEach((element) => {
      dbMission = {
        ...element,
        questions: [],
        key: "",
        img: "",
        completedAt: Date.now(),
        proof: [],
        confirmed: false,
        completed: false,
        description: element.summary,
        esDescription: element.esSummary,
        xp: element.xp,
        title: element.title,
        esTitle: element.esTitle,
      };
      databasedMissions.push(dbMission);
    });
    let finalDBMission = {
      dailyScore: 0,
      dailyCompletion: 0,
      missions: databasedMissions,
    };
    let databasedTeams = [];
    let dbTeam;
    let chosenCompetitors = chosenPlayers.slice();
    chosenCompetitors.push(profile);
    chosenCompetitors.forEach((el) => {
      dbTeam = {
        fName: el.fName,
        lName: el.lName,
        email: el.email,
        phone: el.phone,
        github: el.github,
        id: el.id,
        score: 0,
        percentage: 0,
        planning: [
          {
            name: "Personal",
            code: "personal",
            content: "",
          },
          {
            name: "Professional",
            code: "professional",
            content: "",
          },
          {
            name: "Health & Fitness",
            code: "health",
            content: "",
          },
          {
            name: "Relationship",
            code: "relationship",
            content: "",
          },
          {
            name: "Financial",
            code: "financial",
            content: "",
          },
          {
            name: "Mental",
            code: "mental",
            content: "",
          },
          {
            name: "Social",
            code: "social",
            content: "",
          },
        ],
        review: [
          {
            name: "Personal",
            code: "personal",
            content: "",
          },
          {
            name: "Professional",
            code: "professional",
            content: "",
          },
          {
            name: "Health & Fitness",
            code: "health",
            content: "",
          },
          {
            name: "Relationship",
            code: "relationship",
            content: "",
          },
          {
            name: "Financial",
            code: "financial",
            content: "",
          },
          {
            name: "Mental",
            code: "mental",
            content: "",
          },
          {
            name: "Social",
            code: "social",
            content: "",
          },
        ],
        missions: [
          cloneDeep(finalDBMission),
          cloneDeep(finalDBMission),
          cloneDeep(finalDBMission),
          cloneDeep(finalDBMission),
          cloneDeep(finalDBMission),
        ],
      };

      databasedTeams.push(dbTeam);
    });
    let body = {
      id: uuidv4(),
      athleteId: props.user.id,
      coachId: props.user.mentor,
      // hopefully the Date type doesn't give us problems, could be a place to debug
      startDate: startDate,
      endDate: new Date(Date.now(startDate) + 432000000),
      events: [],
      studySessions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      started: true,
      teams: databasedTeams,
    };
    try {
      await RestAPI.post("pareto", "/sprints", { body });
      await props.connectSocket();
      successToast("Sprint created successfully.");
      props.history.push("/");
    } catch (e) {
      errorToast(e);
      setLoading(false);
    }
    setLoading(false);
  }
  // eslint-disable-next-line no-unused-vars
  /**
   *
   * @returns {Object} result. The validation result.
   * @returns {boolean} result.isValid. whether the form is valid or not
   * @returns {string} result.message. Error message if isValid is false. Empty if true.
   */
  function validateForm() {
    const result = {
      isValid: true,
      message: "",
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate > getCalendarMaxDate() || startDate < today) {
      result.isValid = false;
      result.message = I18n.get("sprintDateError");
    }
    if (!hasSelectedSprintTemplate()) {
      result.isValid = false;
      result.message += I18n.get("sprintChooseTemplateError");
    }
    // console.log(result);
    return result;
  }

  function getCreateAlertMessage() {
    const validateFormResult = validateForm();
    return validateFormResult.message;
  }

  function hasSelectedSprintTemplate() {
    return chosenMissions !== null;
  }
  function renderMissionOptions(missions) {
    return missions.map((mission, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <option key={i} data-value={JSON.stringify(mission)}>
        {mission.title}
      </option>
    ));
  }
  function renderPlayerOptions(data) {
    return data.map((playr, index) => (
      // eslint-disable-next-line react/no-array-index-key
      <option key={index} data-value={JSON.stringify(playr)}>
        {playr.fName} {playr.lName}
      </option>
    ));
  }

  // eslint-disable-next-line no-unused-vars
  function handleChange(value, _input) {
    let parsedJSON = JSON.parse(value);
    setChosenMissions(parsedJSON);
  }

  function onInput(e) {
    if (e.target.nextSibling.id === "players-datalist") {
      let input = document.getElementById("players-input");
      let opts = document.getElementById(e.target.nextSibling.id).childNodes;
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].value === input.value) {
          // An item was selected from the list!
          // yourCallbackHere()
          handlePlayrChange(opts[i].dataset.value, input);
          break;
        }
      }
    } else if (e.target.nextSibling.id === "sprint-options") {
      let input = document.getElementById("sprints-input");
      let opts = document.getElementById(e.target.nextSibling.id).childNodes;
      for (let i = 0; i < opts.length; i++) {
        if (opts[i].value === input.value) {
          // An item was selected from the list!
          // yourCallbackHere()
          return handleChange(opts[i].dataset.value, input);
        }
      }
      return setChosenMissions(null);
    }
  }
  function handlePlayrChange(value, input) {
    let parsedJSON = JSON.parse(value);
    let newPlayers = chosenPlayers.slice();
    newPlayers.push(parsedJSON);
    setChosenPlayers(newPlayers);
    let idxToBeRemoved;
    let updatedUsers = players.slice();
    updatedUsers.map((pl, idx) => {
      if (parsedJSON.id === pl.id) {
        idxToBeRemoved = idx;
      }
    });
    updatedUsers.splice(idxToBeRemoved, 1);
    setPlayers(updatedUsers);
    input.value = "";
  }
  function removeChosenPlayer(chosenPlayer) {
    setChosenPlayers(chosenPlayers.filter((plyr) => plyr !== chosenPlayer));
  }
  return (
    <div>
      <h1>{I18n.get("startSprint")}</h1>
      <p>{I18n.get("sprintDescription")} </p>
      <FormGroup>
        <ControlLabel>{I18n.get("selectTemplate")}</ControlLabel>
        <FormControl
          onInput={onInput}
          componentClass="input"
          id="sprints-input"
          list="sprint-options"
          placeholder={I18n.get("pleaseChooseAnOption")}
          disabled={loading}
        />
        <datalist id="sprint-options">
          {renderMissionOptions(missions)}
        </datalist>
      </FormGroup>

      <FormGroup>
        <ControlLabel>{I18n.get("selectPlayers")}</ControlLabel>
        <FormControl
          onInput={onInput}
          componentClass="input"
          id="players-input"
          list="players-datalist"
          placeholder={I18n.get("pleaseChooseAnOption")}
          disabled={loading}
        />
        <datalist id="players-datalist">
          {renderPlayerOptions(players)}
        </datalist>
      </FormGroup>
      {chosenPlayers.map((chosen) => (
        <div key={chosen.id} className="block">
          {/* TODO: evaluate if these inline styles should apply to all blocks & move to index.css */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 0,
            }}
          >
            {chosen.fName} {chosen.lName}
            <IconButton
              size="small"
              style={{ padding: 7 }}
              onClick={() => removeChosenPlayer(chosen)}
            >
              <FaTimes style={{ transform: "scale(1.4)" }} />
            </IconButton>
          </div>
        </div>
      ))}
      <FormGroup>
        <ControlLabel>{I18n.get("selectSprintDate")}</ControlLabel>
        <p>* {I18n.get("selectSprintDateHelper")}</p>
        <Calendar
          className="react-calendar__create-sprints"
          onChange={(value) => {
            setStartDate(value);
            setReady(true);
          }}
          value={startDate}
          maxDetail="month"
          minDetail="month"
          minDate={new Date()}
          maxDate={getCalendarMaxDate()}
          // tileDisabled={({ date }) => date.getDay() !== 1}
          showNeighboringMonth
          defaultValue={new Date()}
          tileDisabled={() => loading}
        />
      </FormGroup>
      {/* <h3>Currently Selected Start Date: {startDate.toString()}</h3> */}
      <LoaderButton
        style={{ width: 350 }}
        isLoading={loading}
        loadingText={loaded ? I18n.get("saving") : I18n.get("loading")}
        text={I18n.get("create")}
        disabled={!ready || !hasSelectedSprintTemplate() || !startDate}
        onClick={() => createSprint()}
      />
      {!hasSelectedSprintTemplate() && (
        <div style={{ width: 350, marginTop: 10 }}>
          <Alert severity="error">
            <p style={{ fontSize: "1.3rem" }}>{getCreateAlertMessage()}</p>
          </Alert>
        </div>
      )}
    </div>
  );
}

export default SprintCreation;
