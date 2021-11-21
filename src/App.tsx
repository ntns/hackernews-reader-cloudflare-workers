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
          state.stories[selectedIndex],
          ...state.dismissedStories,
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
    <div className="px-2 flex justify-center">
      <div className=""> {/* Centered div */}
        <div className="p-2 text-center text-blue-800 bg-green-200">
          Use keyboard to interact: j, k navigate, f follow link, x dismiss link,
          v toggle view
        </div>
        <h1 className={`my-5 text-center text-3xl font-bold ${state.currentView === "stories" ? "" : "text-red-800"}`}>
          {state.currentView === "stories" ? "HackerNews Stories" : "Dismissed stories"}
        </h1>
        <div className="p-1 bg-yellow-300 text-center md:hidden">
          Sorry, no mobile support! This is a keyboard driven UI.
        </div>
        {state.showPopupBlockedAlert && (
          <div className="p-2 mb-4 bg-red-100 text-red-500">
            <span>⚠</span>
            <cite>
              Your browser may be blocking popups. Allow popups to open
              links in a new window.
            </cite>
          </div>
        )}
        {list.map((story: Story, i: number) => (
          <div className={`my-1 px-5 py-1 text-xl ${i === state.selectedIndex ? "text-gray-900 bg-red-50 border-l-2 border-red-900 transition ease-out duration-200" : "text-gray-700 bg-gray-50 rounded"}`}
            key={story.id}
            onClick={() => {
              dispatch({ type: "navSelect", payload: i });
            }}
          >
            <span className={`block md:w-720 md:truncate ${i === state.selectedIndex ? "font-semibold" : ""}`}>{story.title}</span>
            <span className={`block md:w-720 md:truncate text-sm mb-3 ${i === state.selectedIndex ? "text-gray-700" : "text-gray-400 hidden"}`}>{story.link.replace("https://", "")}</span>
          </div>
        ))}
      </div>
    </div >
  );
};

export default App;
