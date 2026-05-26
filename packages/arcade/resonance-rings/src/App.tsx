import { PGLiteProvider } from './db/PGLiteProvider';
import { SpoonRouter } from './components/SpoonRouter';

function App() {
  return (
    <PGLiteProvider>
      <SpoonRouter />
    </PGLiteProvider>
  );
}

export default App;
