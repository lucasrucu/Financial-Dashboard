import { builtInThemes, defaultThemeId } from "@/themes";
import type { Theme } from "@/themes/types";

const STORAGE_KEY = "financial-dashboard-theme";

function serializeThemes(themes: Theme[]): string {
  return JSON.stringify(
    themes.map((theme) => ({
      id: theme.id,
      variables: theme.variables,
    }))
  );
}

export function getThemeBootScript(): string {
  const builtIn = serializeThemes(builtInThemes);

  return `(function(){try{var key=${JSON.stringify(STORAGE_KEY)};var raw=localStorage.getItem(key);var selectedId=${JSON.stringify(defaultThemeId)};var customThemes=[];if(raw){var parsed=JSON.parse(raw);if(parsed&&parsed.state){if(parsed.state.selectedThemeId){selectedId=parsed.state.selectedThemeId;}if(Array.isArray(parsed.state.customThemes)){customThemes=parsed.state.customThemes;}}}var builtIn=${builtIn};var theme=builtIn.find(function(t){return t.id===selectedId;});if(!theme){theme=customThemes.find(function(t){return t.id===selectedId;});}if(!theme){theme=builtIn[0];}var root=document.documentElement;root.dataset.theme=theme.id;Object.keys(theme.variables).forEach(function(token){root.style.setProperty("--"+token,theme.variables[token]);});}catch(e){}})();`;
}
