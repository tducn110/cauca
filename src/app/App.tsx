import { useAppShell } from "./hooks/useAppShell";
import { GameApp } from "./GameApp";

export default function App() {
  const shell = useAppShell();
  return <GameApp {...shell} />;
}
