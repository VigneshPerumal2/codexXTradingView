import { sampleDashboardState } from "@codex-tv/shared";
import { DashboardShell } from "../components/DashboardShell";

export default function Home() {
  return <DashboardShell initialState={sampleDashboardState} />;
}
