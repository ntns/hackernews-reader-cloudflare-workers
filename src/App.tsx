import { useEffect, useReducer } from "react";
import { useKeyPress } from "./hooks/useKeyPress";

type Story = {
  id: string;
  title: string;
  link: string;
};

type CurrentView = "stories" | "dismissedStories";

type State = {
  selectedIndex: number;
  stories: Story[];
  dismissedStories: Story[];
  currentView: CurrentView;
  showPopupBlockedAlert: boolean;
};

type Action =
  | { type: "navUp" }
  | { type: "navDown" }
  | { type: "navSelect"; payload: number }
  | { type: "followLink" }
  | { type: "openComments" }
  | { type: "dismissStory" }
  | { type: "updateStories"; stories: Story[] }
  | { type: "toggleView" }
  | { type: "toggleHelp" };

const reducer = (state: State, action: Action): State => {
  const list =
    state.currentView === "stories" ? state.stories : state.dismissedStories;
  const selectedIndex = state.selectedIndex;
  switch (action.type) {
    case "navUp":
      return {
        ...state,
        selectedIndex:
          selectedIndex !== 0
            ? selectedIndex - 1
            : list.length > 0
              ? list.length - 1
              : 0
      };
    case "navDown":
      return {
        ...state,
        selectedIndex:
          selectedIndex !== list.length - 1 && list.length > 0
            ? selectedIndex + 1
            : 0
      };
    case "navSelect":
      return {
        ...state,
        selectedIndex: action.payload
      };
    case "followLink":
      if (list.length === 0) {
        return state;
      }
      const success = window.open(list[selectedIndex].link);
      if (success == null) {
        console.warn("popup blocked");
        return {
          ...state,
          showPopupBlockedAlert: true
        };
      }
      return state;
    case "openComments":
      // TODO
      return state;
    case "dismissStory": {
      if (state.currentView !== "stories" || list.length === 0) {
        return state;
      }
      const stories = state.stories.filter((_, i) => i !== selectedIndex);
      return {
        ...state,
        stories,
        dismissedStories: [
          ...state.dismissedStories,
          state.stories[selectedIndex]
        ],
        selectedIndex:
          stories.length > 0 && selectedIndex > stories.length - 1
            ? stories.length - 1
            : selectedIndex
      };
    }
    case "updateStories": {
      const newStories = action.stories
        .filter(
          (story) =>
            state.stories.map((story) => story.id).indexOf(story.id) === -1
        )
        .filter(
          (story) =>
            state.dismissedStories
              .map((story) => story.id)
              .indexOf(story.id) === -1
        );
      return {
        ...state,
        stories: [...state.stories, ...newStories]
      };
    }
    case "toggleView":
      return {
        ...state,
        selectedIndex: 0,
        currentView:
          state.currentView === "stories" ? "dismissedStories" : "stories"
      };
    case "toggleHelp": // TODO
      return state;
  }
};

// TODO: change API, current limit of 10 items
const STORIES_URL =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fnews.ycombinator.com%2Frss";

const App = () => {
  let savedStories = [];
  let savedDismissedStories = [];
  try {
    savedStories = JSON.parse(localStorage.getItem("stories") || "[]");
    savedDismissedStories = JSON.parse(
      localStorage.getItem("dismissedStories") || "[]"
    );
  } catch { }

  const initialState: State = {
    selectedIndex: 0,
    stories: savedStories || [],
    dismissedStories: savedDismissedStories || [],
    currentView: "stories",
    showPopupBlockedAlert: false
  };

  // Keyboard navigation code adapted from: 
  // https://blog.whereisthemouse.com/create-a-list-component-with-keyboard-navigation-in-react
  const upPressed = useKeyPress("k");
  const downPressed = useKeyPress("j");
  const followPressed = useKeyPress("f");
  const dismissPressed = useKeyPress("x");
  const toggleViewPressed = useKeyPress("v");
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (upPressed) {
      dispatch({ type: "navUp" });
    }
    if (downPressed) {
      dispatch({ type: "navDown" });
    }
    if (followPressed) {
      dispatch({ type: "followLink" });
    }
    if (dismissPressed) {
      dispatch({ type: "dismissStory" });
    }
    if (toggleViewPressed) {
      dispatch({ type: "toggleView" });
    }
  }, [
    upPressed,
    downPressed,
    followPressed,
    dismissPressed,
    toggleViewPressed
  ]);

  // Load stories from localstorage
  useEffect(() => {
    try {
      JSON.parse(localStorage.getItem("stories") || "[]");
      JSON.parse(localStorage.getItem("dismissedStories") || "[]");
    } catch { }
  }, []);

  // Save stories to localstorage
  useEffect(() => {
    localStorage.setItem("stories", JSON.stringify(state.stories));
    localStorage.setItem(
      "dismissedStories",
      JSON.stringify(state.dismissedStories)
    );
  }, [state.stories, state.dismissedStories]);

  // Fetch new stories
  useEffect(() => {
    async function fetchStories() {
      const response = await fetch(STORIES_URL);
      const { items } = await response.json();
      const stories = items.map(
        (story: { id: string; title: string; link: string }) => ({
          id: story.link, // TODO: use real HN story ID
          title: story.title,
          link: story.link
        })
      );
      dispatch({ type: "updateStories", stories });
    }
    fetchStories();
  }, []);

  const list =
    state.currentView === "stories" ? state.stories : state.dismissedStories;

  return (
    <div>
      <p>
        Use keyboard to interact: j, k navigate, f follow link, x dismiss link,
        v toggle view
      </p>
      <h1>
        {state.currentView === "stories" ? "Stories" : "Dismissed stories"}
      </h1>
      {state.showPopupBlockedAlert && (
        <cite style={{ color: "red" }}>
          It seems your browser is blocking popups. Please allow popups to open
          links in a new window. <p></p>
        </cite>
      )}
      {list.map((story: Story, i: number) => (
        <div
          key={story.id}
          onClick={() => {
            dispatch({ type: "navSelect", payload: i });
          }}
          style={{
            cursor: "pointer",
            color:
              i === state.selectedIndex
                ? state.currentView === "stories"
                  ? "blue"
                  : "darkred"
                : "black"
          }}
        >
          {story.title}
        </div>
      ))}
      <p>selected index: {state.selectedIndex}</p>
    </div>
  );
};

export default App;
