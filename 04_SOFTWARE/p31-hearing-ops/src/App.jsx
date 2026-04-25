import HearingPrep from './HearingPrep.jsx'
import { CoherenceProvider } from './CoherenceContext.jsx'

export default function App() {
  return (
    <CoherenceProvider>
      <HearingPrep />
    </CoherenceProvider>
  )
}