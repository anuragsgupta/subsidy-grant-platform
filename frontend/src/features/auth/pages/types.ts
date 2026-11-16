import type { Path } from 'react-router-dom';

// Shape of the location.state passed by ProtectedRoute when redirecting to /login
export interface LocationState {
  from: Partial<Path>;
}
