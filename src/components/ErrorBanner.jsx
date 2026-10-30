import { Info, AlertTriangle } from 'lucide-react';
import { describeFirebaseError } from '@/firebase';

export function ErrorBanner({ type, error, onDismiss }) {
  if (type === 'auth' && error) {
    return (
      <div className="error-banner auth">
        <AlertTriangle size={16} />
        <span>Authentication error: {describeFirebaseError(error)}</span>
        {onDismiss && <button className="banner-close" onClick={onDismiss} aria-label="Dismiss">✕</button>}
      </div>
    );
  }
  if (type === 'listener' && error) {
    return (
      <div className="error-banner auth">
        <AlertTriangle size={16} />
        <span>Could not load live data: {describeFirebaseError(error)}</span>
      </div>
    );
  }
  if (type === 'demo') {
    return (
      <div className="error-banner info">
        <Info size={16} />
        <span>Demo Mode — Firebase not configured. Showing simulated data.</span>
      </div>
    );
  }
  return null;
}
