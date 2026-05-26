import { PGLiteProvider } from './db/PGLiteProvider';
import { SpoonProvider } from './components/SpoonShell';
import { SpoonRouter } from './components/SpoonRouter';

function App() {
  return (
    <PGLiteProvider>
      <SpoonProvider>
        <SpoonRouter />
      </SpoonProvider>
    </PGLiteProvider>
  );
}

export default App;
